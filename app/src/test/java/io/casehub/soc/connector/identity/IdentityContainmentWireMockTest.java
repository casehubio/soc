package io.casehub.soc.connector.identity;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class IdentityContainmentWireMockTest {

    static WireMockServer wireMock;

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

    @Nested
    class OktaProviderTests {

        IdentityContainmentConnector connector;

        @BeforeEach
        void setUp() {
            wireMock.resetAll();
            String baseUrl = "http://localhost:" + wireMock.port();
            var provider = new OktaIdentityProvider(baseUrl, "test-ssws-token");
            connector = new IdentityContainmentConnector();
            connector.provider = provider;
        }

        @Test
        void successfulAccountDisable() {
            stubFor(post(urlPathMatching("/api/v1/users/.*/lifecycle/suspend"))
                    .willReturn(okJson("{}")));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "user-123"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isTrue();
            assertThat(response.details()).contains("user-123");
            assertThat(response.details()).contains("okta");
            assertThat(response.metadata()).containsEntry("provider", "okta");

            verify(postRequestedFor(urlPathMatching("/api/v1/users/.*/lifecycle/suspend"))
                    .withHeader("Authorization", equalTo("SSWS test-ssws-token")));
        }

        @Test
        void successfulSessionRevocation() {
            stubFor(delete(urlPathMatching("/api/v1/users/.*/sessions"))
                    .willReturn(aResponse().withStatus(204)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "revoke.credentials", Map.of("userId", "user-123"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isTrue();
            assertThat(response.details()).contains("revoked");
        }

        @Test
        void successfulApiKeyRotation() {
            stubFor(post(urlPathMatching("/api/v1/apps/.*/credentials/keys/generate.*"))
                    .willReturn(aResponse().withStatus(201)
                            .withHeader("Content-Type", "application/json")
                            .withBody("{\"kid\":\"new-key-id\",\"created\":\"2026-09-14\"}")));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "rotate.api.key", Map.of("appId", "app-456"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isTrue();
            assertThat(response.details()).contains("app-456");
        }

        @Test
        void userNotFoundReturnsFailure() {
            stubFor(post(urlPathMatching("/api/v1/users/.*/lifecycle/suspend"))
                    .willReturn(aResponse().withStatus(404)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "unknown"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isFalse();
            assertThat(response.errorReason()).contains("not found");
            assertThat(response.retryable()).isFalse();
        }

        @Test
        void serverErrorReturnsRetryable() {
            stubFor(post(urlPathMatching("/api/v1/users/.*/lifecycle/suspend"))
                    .willReturn(aResponse().withStatus(500)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "user-123"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isFalse();
            assertThat(response.retryable()).isTrue();
        }

        @Test
        void rateLimitedReturnsRetryable() {
            stubFor(post(urlPathMatching("/api/v1/users/.*/lifecycle/suspend"))
                    .willReturn(aResponse().withStatus(429)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "user-123"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isFalse();
            assertThat(response.retryable()).isTrue();
        }
    }

    @Nested
    class GraphProviderTests {

        IdentityContainmentConnector connector;

        @BeforeEach
        void setUp() {
            wireMock.resetAll();
            String baseUrl = "http://localhost:" + wireMock.port();

            stubFor(post(urlPathMatching(".*/oauth2/v2.0/token"))
                    .willReturn(okJson("{\"access_token\":\"test-graph-token\",\"expires_in\":3599}")));

            var provider = new GraphIdentityProvider(
                    baseUrl, baseUrl, "test-tenant", "test-client", "test-secret");
            connector = new IdentityContainmentConnector();
            connector.provider = provider;
        }

        @Test
        void successfulAccountDisable() {
            stubFor(patch(urlPathMatching("/v1.0/users/.*"))
                    .willReturn(aResponse().withStatus(204)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "user-789"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isTrue();
            assertThat(response.details()).contains("user-789");
            assertThat(response.details()).contains("graph");
            assertThat(response.metadata()).containsEntry("provider", "graph");

            verify(patchRequestedFor(urlPathMatching("/v1.0/users/.*"))
                    .withHeader("Authorization", equalTo("Bearer test-graph-token"))
                    .withRequestBody(containing("accountEnabled")));
        }

        @Test
        void successfulSessionRevocation() {
            stubFor(post(urlPathMatching("/v1.0/users/.*/revokeSignInSessions"))
                    .willReturn(okJson("{\"value\":true}")));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "revoke.credentials", Map.of("userId", "user-789"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isTrue();
            assertThat(response.details()).contains("revoked");
        }

        @Test
        void successfulApiKeyRotation() {
            stubFor(post(urlPathMatching("/v1.0/applications/.*/addPassword"))
                    .willReturn(okJson("{\"keyId\":\"new-graph-key\",\"secretText\":\"secret\"}")));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "rotate.api.key", Map.of("appId", "app-abc"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isTrue();
            assertThat(response.details()).contains("app-abc");
        }

        @Test
        void userNotFoundReturnsFailure() {
            stubFor(patch(urlPathMatching("/v1.0/users/.*"))
                    .willReturn(aResponse().withStatus(404)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "unknown"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isFalse();
            assertThat(response.errorReason()).contains("not found");
            assertThat(response.retryable()).isFalse();
        }

        @Test
        void oAuth2TokenFailureReturnsRetryable() {
            wireMock.resetAll();
            stubFor(post(urlPathMatching(".*/oauth2/v2.0/token"))
                    .willReturn(aResponse().withStatus(401)
                            .withHeader("Content-Type", "application/json")
                            .withBody("{\"error\":\"invalid_client\"}")));

            String base = "http://localhost:" + wireMock.port();
            var provider = new GraphIdentityProvider(
                    base, base, "test-tenant", "bad-client", "bad-secret");
            connector.provider = provider;

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "user-789"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isFalse();
            assertThat(response.errorReason()).contains("token request failed");
            assertThat(response.retryable()).isTrue();
        }

        @Test
        void serverErrorReturnsRetryable() {
            stubFor(patch(urlPathMatching("/v1.0/users/.*"))
                    .willReturn(aResponse().withStatus(500)));

            ContainmentResponse response = connector.execute(new ContainmentRequest(
                    "disable.user.account", Map.of("userId", "user-789"),
                    "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

            assertThat(response.success()).isFalse();
            assertThat(response.retryable()).isTrue();
        }
    }

    @Test
    void missingUserIdReturnsFailureWithoutHttpCall() {
        var connector = new IdentityContainmentConnector();
        connector.provider = IdentityProvider.unconfigured();

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "disable.user.account", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("userId");
        assertThat(response.retryable()).isFalse();

        wireMock.verify(0, anyRequestedFor(anyUrl()));
    }

    @Test
    void unsupportedActionReturnsFailureWithoutHttpCall() {
        var connector = new IdentityContainmentConnector();
        connector.provider = IdentityProvider.unconfigured();

        ContainmentResponse response = connector.execute(new ContainmentRequest(
                "isolate.host", Map.of("userId", "u-1"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L));

        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Unsupported");

        wireMock.verify(0, anyRequestedFor(anyUrl()));
    }
}
