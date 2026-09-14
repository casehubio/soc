package io.casehub.soc.connector.crowdstrike;

import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CrowdStrikeContainmentConnectorTest {

    @Test
    void mapsIsolateHostToContainAction() {
        var connector = new CrowdStrikeContainmentConnector();

        assertThat(connector.mapActionName("isolate.host")).isEqualTo("contain");
    }

    @Test
    void mapsWipeEndpointToLiftContainment() {
        var connector = new CrowdStrikeContainmentConnector();

        assertThat(connector.mapActionName("wipe.endpoint")).isEqualTo("lift_containment");
    }

    @Test
    void unknownActionTypeReturnsNull() {
        var connector = new CrowdStrikeContainmentConnector();

        assertThat(connector.mapActionName("block.ip")).isNull();
    }

    @Test
    void missingDeviceIdReturnsFailure() {
        var connector = new CrowdStrikeContainmentConnector();

        var request = new ContainmentRequest(
                "isolate.host", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("deviceId");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void validRequestExtractsDeviceId() {
        var connector = new CrowdStrikeContainmentConnector();

        var request = new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "abc123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNull();
    }

    @Test
    void unsupportedActionTypeReturnsFailure() {
        var connector = new CrowdStrikeContainmentConnector();

        var request = new ContainmentRequest(
                "block.ip", Map.of("deviceId", "abc123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Unsupported");
    }
}
