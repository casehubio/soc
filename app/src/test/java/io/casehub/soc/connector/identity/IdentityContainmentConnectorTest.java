package io.casehub.soc.connector.identity;

import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class IdentityContainmentConnectorTest {

    @Test
    void disableUserAccountIsSupportedAction() {
        var connector = new IdentityContainmentConnector();
        assertThat(connector.isSupportedAction("disable.user.account")).isTrue();
    }

    @Test
    void revokeCredentialsIsSupportedAction() {
        var connector = new IdentityContainmentConnector();
        assertThat(connector.isSupportedAction("revoke.credentials")).isTrue();
    }

    @Test
    void rotateApiKeyIsSupportedAction() {
        var connector = new IdentityContainmentConnector();
        assertThat(connector.isSupportedAction("rotate.api.key")).isTrue();
    }

    @Test
    void unsupportedActionTypeReturnsFailure() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "isolate.host", Map.of("userId", "u-1"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("Unsupported");
        assertThat(response.retryable()).isFalse();
    }

    @Test
    void disableAccountMissingUserIdReturnsFailure() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "disable.user.account", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("userId");
    }

    @Test
    void revokeCredentialsMissingUserIdReturnsFailure() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "revoke.credentials", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("userId");
    }

    @Test
    void rotateApiKeyMissingAppIdReturnsFailure() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "rotate.api.key", Map.of(),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.validateAndExtract(request);

        assertThat(response).isNotNull();
        assertThat(response.success()).isFalse();
        assertThat(response.errorReason()).contains("appId");
    }

    @Test
    void validDisableAccountPassesValidation() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "disable.user.account", Map.of("userId", "user-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        assertThat(connector.validateAndExtract(request)).isNull();
    }

    @Test
    void validRevokeCredentialsPassesValidation() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "revoke.credentials", Map.of("userId", "user-123"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        assertThat(connector.validateAndExtract(request)).isNull();
    }

    @Test
    void validRotateApiKeyPassesValidation() {
        var connector = new IdentityContainmentConnector();

        var request = new ContainmentRequest(
                "rotate.api.key", Map.of("appId", "app-456"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        assertThat(connector.validateAndExtract(request)).isNull();
    }
}
