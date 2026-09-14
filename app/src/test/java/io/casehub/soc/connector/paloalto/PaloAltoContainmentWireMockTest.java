package io.casehub.soc.connector.paloalto;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class PaloAltoContainmentWireMockTest {

    static WireMockServer wireMock;
    PaloAltoContainmentConnector connector;
    PaloAltoApiClient apiClient;

    private static final String CONFIG_SUCCESS =
            "<response status=\"success\" code=\"20\"><msg>command succeeded</msg></response>";
    private static final String COMMIT_SUCCESS =
            "<response status=\"success\" code=\"19\"><result><msg>"
            + "<line>Commit job enqueued with jobid 42</line></msg>"
            + "<job>42</job></result></response>";
    private static final String JOB_COMPLETE =
            "<response status=\"success\"><result><job><id>42</id>"
            + "<status>FIN</status><result>OK</result>"
            + "<progress>100</progress></job></result></response>";
    private static final String JOB_FAILED =
            "<response status=\"success\"><result><job><id>42</id>"
            + "<status>FIN</status><result>FAIL</result>"
            + "<details><line>Configuration commit failed</line></details>"
            + "<progress>100</progress></job></result></response>";
    private static final String CONFIG_ERROR =
            "<response status=\"error\" code=\"12\">"
            + "<msg><line>Object not found</line></msg></response>";

    @BeforeAll
    static void startWireMock() {
        wireMock = new WireMockServer(0);
        wireMock.start();
        WireMock.configureFor(wireMock.port());
    }

    @AfterAll
    static void stopWireMock() {
        wireMock.stop();
    }

    @BeforeEach
    void setUp() {
        wireMock.resetAll();

        String baseUrl = "http://localhost:" + wireMock.port();
        apiClient = new PaloAltoApiClient(baseUrl, "test-api-key", "vsys1",
                "localhost.localdomain", 100, 5000, io.vertx.core.Vertx.vertx());

        connector = new PaloAltoContainmentConnector();
        connector.apiClient = apiClient;
        connector.deviceName = "localhost.localdomain";
        connector.vsys = "vsys1";
        connector.defaultAddressGroup = "casehub-blocked-ips";
        connector.defaultUrlCategory = "casehub-blocked-domains";
    }

    private void stubConfigSuccess() {
        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("config"))
                .willReturn(okXml(CONFIG_SUCCESS)));
    }

    private void stubCommitAndJobSuccess() {
        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("commit"))
                .willReturn(okXml(COMMIT_SUCCESS)));

        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("op"))
                .willReturn(okXml(JOB_COMPLETE)));
    }

    @Test
    void successfulIpBlock() {
        stubConfigSuccess();
        stubCommitAndJobSuccess();

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.0.5"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("10.0.0.5");
        assertThat(response.details()).contains("casehub-blocked-ips");
        assertThat(response.metadata()).containsEntry("paloalto_job_id", "42");
        assertThat(response.metadata()).containsEntry("paloalto_address_object", "casehub-10-0-0-5");

        verify(2, postRequestedFor(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("config"))
                .withQueryParam("key", equalTo("test-api-key")));
    }

    @Test
    void successfulDomainBlock() {
        stubConfigSuccess();
        stubCommitAndJobSuccess();

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.domain", Map.of("domain", "evil.example.com"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("evil.example.com");
        assertThat(response.details()).contains("casehub-blocked-domains");
        assertThat(response.metadata()).containsEntry("paloalto_job_id", "42");
    }

    @Test
    void successfulNetworkSegmentation() {
        stubConfigSuccess();
        stubCommitAndJobSuccess();

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "network.segmentation",
                Map.of("sourceZone", "trust", "destZone", "dmz", "ruleName", "casehub-seg-001"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("trust");
        assertThat(response.details()).contains("dmz");
        assertThat(response.metadata()).containsEntry("paloalto_job_id", "42");
        assertThat(response.metadata()).containsEntry("paloalto_rule_name", "casehub-seg-001");
    }

    @Test
    void configErrorReturnsFailure() {
        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("config"))
                .willReturn(okXml(CONFIG_ERROR)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.0.5"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Object not found");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void commitFailureReturnsRetryableError() {
        stubConfigSuccess();

        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("commit"))
                .willReturn(okXml(COMMIT_SUCCESS)));

        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("op"))
                .willReturn(okXml(JOB_FAILED)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.0.5"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("commit failed");
        assertThat(response.retryable()).isTrue();
    }

    @Test
    void authenticationFailureReturnsNonRetryableError() {
        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("config"))
                .willReturn(aResponse().withStatus(403)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.0.5"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("authentication failed");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void serverErrorReturnsRetryableError() {
        stubFor(post(urlPathEqualTo("/api/"))
                .withQueryParam("type", equalTo("config"))
                .willReturn(aResponse().withStatus(500)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.0.5"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.retryable()).isTrue();
    }

    @Test
    void missingIpParameterReturnsFailureWithoutHttpCall() {
        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("ip");
        assertThat(response.retryable()).isFalse();

        wireMock.verify(0, postRequestedFor(urlPathEqualTo("/api/")));
    }

    @Test
    void customAddressGroupOverridesDefault() {
        stubConfigSuccess();
        stubCommitAndJobSuccess();

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.0.5", "addressGroup", "custom-group"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("custom-group");
    }

    @Test
    void unsupportedActionTypeReturnsFailureWithoutHttpCall() {
        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("ip", "10.0.0.5"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 90_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Unsupported");
        assertThat(response.retryable()).isFalse();

        wireMock.verify(0, postRequestedFor(urlPathEqualTo("/api/")));
    }
}
