package io.casehub.soc.connector.crowdstrike;

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

class CrowdStrikeContainmentWireMockTest {

    static WireMockServer wireMock;
    CrowdStrikeContainmentConnector connector;
    CrowdStrikeOAuth2Client oAuth2Client;

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

        stubFor(post(urlEqualTo("/oauth2/token"))
                .willReturn(okJson("{\"access_token\":\"test-token\",\"expires_in\":1799}")));

        String baseUrl = "http://localhost:" + wireMock.port();
        oAuth2Client = new CrowdStrikeOAuth2Client(baseUrl, "test-id", "test-secret");

        connector = new CrowdStrikeContainmentConnector();
        connector.oAuth2Client = oAuth2Client;
        connector.apiBase = baseUrl;
    }

    @Test
    void successfulHostIsolation() {
        stubFor(post(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .withQueryParam("action_name", equalTo("contain"))
                .willReturn(okJson("{\"resources\":[{\"id\":\"dev-123\"}],\"errors\":[]}")));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "dev-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("dev-123");
        assertThat(response.metadata()).containsEntry("action_name", "contain");

        verify(postRequestedFor(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .withHeader("Authorization", equalTo("Bearer test-token")));
    }

    @Test
    void successfulEndpointWipe() {
        stubFor(post(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .withQueryParam("action_name", equalTo("lift_containment"))
                .willReturn(okJson("{\"resources\":[{\"id\":\"dev-456\"}],\"errors\":[]}")));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "wipe.endpoint", Map.of("deviceId", "dev-456"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isTrue();
        assertThat(response.metadata()).containsEntry("action_name", "lift_containment");
    }

    @Test
    void crowdStrikeReturnsError() {
        stubFor(post(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .willReturn(okJson("{\"resources\":[],\"errors\":[{\"code\":404,\"message\":\"Device not found\"}]}")));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "unknown"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Device not found");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void crowdStrikeRateLimited() {
        stubFor(post(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .willReturn(aResponse().withStatus(429)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "dev-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.retryable()).isTrue();
    }

    @Test
    void crowdStrikeServerError() {
        stubFor(post(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .willReturn(aResponse().withStatus(500)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "dev-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.retryable()).isTrue();
    }

    @Test
    void oAuth2TokenRequestFails() {
        wireMock.resetAll();
        stubFor(post(urlEqualTo("/oauth2/token"))
                .willReturn(aResponse().withStatus(401)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"error\":\"invalid_client\"}")));

        oAuth2Client = new CrowdStrikeOAuth2Client(
                "http://localhost:" + wireMock.port(), "bad-id", "bad-secret");
        connector.oAuth2Client = oAuth2Client;

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "dev-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("authentication failed");
        assertThat(response.retryable()).isTrue();
    }

    @Test
    void missingDeviceIdParameter() {
        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("deviceId");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void crowdStrikeClientError() {
        stubFor(post(urlPathEqualTo("/devices/entities/devices-actions/v2"))
                .willReturn(aResponse().withStatus(403)));

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("deviceId", "dev-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("403");
        assertThat(response.retryable()).isFalse();
    }
}
