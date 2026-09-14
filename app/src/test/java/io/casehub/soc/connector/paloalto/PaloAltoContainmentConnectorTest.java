package io.casehub.soc.connector.paloalto;

import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PaloAltoContainmentConnectorTest {

    @Test
    void blockIpIsSupportedAction() {
        var connector = new PaloAltoContainmentConnector();
        assertThat(connector.isSupportedAction("block.ip")).isTrue();
    }

    @Test
    void blockDomainIsSupportedAction() {
        var connector = new PaloAltoContainmentConnector();
        assertThat(connector.isSupportedAction("block.domain")).isTrue();
    }

    @Test
    void networkSegmentationIsSupportedAction() {
        var connector = new PaloAltoContainmentConnector();
        assertThat(connector.isSupportedAction("network.segmentation")).isTrue();
    }

    @Test
    void unsupportedActionTypeReturnsFailure() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "isolate.host", Map.of("ip", "1.2.3.4"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Unsupported");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void blockIpMissingIpReturnsFailure() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "block.ip", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("ip");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void blockDomainMissingDomainReturnsFailure() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "block.domain", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("domain");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void networkSegmentationMissingSourceZoneReturnsFailure() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "network.segmentation", Map.of("destZone", "dmz", "ruleName", "test-rule"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("sourceZone");
    }

    @Test
    void networkSegmentationMissingDestZoneReturnsFailure() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "network.segmentation", Map.of("sourceZone", "trust", "ruleName", "test-rule"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("destZone");
    }

    @Test
    void networkSegmentationMissingRuleNameReturnsFailure() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "network.segmentation", Map.of("sourceZone", "trust", "destZone", "dmz"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("ruleName");
    }

    @Test
    void validBlockIpRequestPassesValidation() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "block.ip", Map.of("ip", "192.168.1.100"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNull();
    }

    @Test
    void validBlockDomainRequestPassesValidation() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "block.domain", Map.of("domain", "evil.com"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNull();
    }

    @Test
    void validNetworkSegmentationRequestPassesValidation() {
        var connector = new PaloAltoContainmentConnector();

        var request = new ContainmentRequest(
                "network.segmentation",
                Map.of("sourceZone", "trust", "destZone", "dmz", "ruleName", "casehub-seg-001"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNull();
    }

    @Test
    void sanitizesIpForAddressObjectName() {
        assertThat(PaloAltoContainmentConnector.sanitizeIp("192.168.1.100"))
                .isEqualTo("192-168-1-100");
    }

    @Test
    void buildsAddressXpath() {
        var connector = new PaloAltoContainmentConnector();
        connector.deviceName = "localhost.localdomain";
        connector.vsys = "vsys1";

        String xpath = connector.buildAddressXpath("casehub-192-168-1-100");

        assertThat(xpath).isEqualTo(
                "/config/devices/entry[@name='localhost.localdomain']"
                + "/vsys/entry[@name='vsys1']"
                + "/address/entry[@name='casehub-192-168-1-100']");
    }

    @Test
    void buildsAddressGroupMemberXpath() {
        var connector = new PaloAltoContainmentConnector();
        connector.deviceName = "localhost.localdomain";
        connector.vsys = "vsys1";

        String xpath = connector.buildAddressGroupMemberXpath("casehub-blocked-ips");

        assertThat(xpath).isEqualTo(
                "/config/devices/entry[@name='localhost.localdomain']"
                + "/vsys/entry[@name='vsys1']"
                + "/address-group/entry[@name='casehub-blocked-ips']/static");
    }

    @Test
    void buildsUrlCategoryMemberXpath() {
        var connector = new PaloAltoContainmentConnector();
        connector.deviceName = "localhost.localdomain";
        connector.vsys = "vsys1";

        String xpath = connector.buildUrlCategoryMemberXpath("casehub-blocked-domains");

        assertThat(xpath).isEqualTo(
                "/config/devices/entry[@name='localhost.localdomain']"
                + "/vsys/entry[@name='vsys1']"
                + "/profiles/custom-url-category/entry[@name='casehub-blocked-domains']/list");
    }

    @Test
    void buildsSecurityRuleXpath() {
        var connector = new PaloAltoContainmentConnector();
        connector.deviceName = "localhost.localdomain";
        connector.vsys = "vsys1";

        String xpath = connector.buildSecurityRuleXpath("casehub-seg-001");

        assertThat(xpath).isEqualTo(
                "/config/devices/entry[@name='localhost.localdomain']"
                + "/vsys/entry[@name='vsys1']"
                + "/rulebase/security/rules/entry[@name='casehub-seg-001']");
    }
}
