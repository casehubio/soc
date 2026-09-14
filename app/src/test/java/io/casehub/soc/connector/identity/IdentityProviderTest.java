package io.casehub.soc.connector.identity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentityProviderTest {

    @Test
    void unconfiguredProviderThrowsOnDisableAccount() {
        var provider = IdentityProvider.unconfigured();

        assertThatThrownBy(() -> provider.disableAccount("user-1"))
                .isInstanceOf(IdentityApiException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void unconfiguredProviderThrowsOnRevokeSessions() {
        var provider = IdentityProvider.unconfigured();

        assertThatThrownBy(() -> provider.revokeSessions("user-1"))
                .isInstanceOf(IdentityApiException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void unconfiguredProviderThrowsOnRotateApiKey() {
        var provider = IdentityProvider.unconfigured();

        assertThatThrownBy(() -> provider.rotateApiKey("app-1"))
                .isInstanceOf(IdentityApiException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void unconfiguredProviderName() {
        assertThat(IdentityProvider.unconfigured().providerName()).isEqualTo("unconfigured");
    }

    @Test
    void oktaProviderReportsName() {
        var provider = new OktaIdentityProvider("https://dev.okta.com", "ssws-token");
        assertThat(provider.providerName()).isEqualTo("okta");
    }

    @Test
    void oktaProviderBuildsDisableUrl() {
        var provider = new OktaIdentityProvider("https://dev.okta.com", "ssws-token");
        assertThat(provider.buildDisableUrl("user-123"))
                .isEqualTo("https://dev.okta.com/api/v1/users/user-123/lifecycle/suspend");
    }

    @Test
    void oktaProviderBuildsRevokeUrl() {
        var provider = new OktaIdentityProvider("https://dev.okta.com", "ssws-token");
        assertThat(provider.buildRevokeUrl("user-123"))
                .isEqualTo("https://dev.okta.com/api/v1/users/user-123/sessions");
    }

    @Test
    void oktaProviderBuildsRotateUrl() {
        var provider = new OktaIdentityProvider("https://dev.okta.com", "ssws-token");
        assertThat(provider.buildRotateUrl("app-456"))
                .isEqualTo("https://dev.okta.com/api/v1/apps/app-456/credentials/keys/generate?validityYears=1");
    }

    @Test
    void graphProviderReportsName() {
        var provider = new GraphIdentityProvider(
                "https://graph.microsoft.com", "tenant-1", "client-1", "secret-1");
        assertThat(provider.providerName()).isEqualTo("graph");
    }

    @Test
    void graphProviderBuildsDisableUrl() {
        var provider = new GraphIdentityProvider(
                "https://graph.microsoft.com", "tenant-1", "client-1", "secret-1");
        assertThat(provider.buildDisableUrl("user-123"))
                .isEqualTo("https://graph.microsoft.com/v1.0/users/user-123");
    }

    @Test
    void graphProviderBuildsRevokeUrl() {
        var provider = new GraphIdentityProvider(
                "https://graph.microsoft.com", "tenant-1", "client-1", "secret-1");
        assertThat(provider.buildRevokeUrl("user-123"))
                .isEqualTo("https://graph.microsoft.com/v1.0/users/user-123/revokeSignInSessions");
    }

    @Test
    void graphProviderBuildsRotateUrl() {
        var provider = new GraphIdentityProvider(
                "https://graph.microsoft.com", "tenant-1", "client-1", "secret-1");
        assertThat(provider.buildRotateUrl("app-456"))
                .isEqualTo("https://graph.microsoft.com/v1.0/applications/app-456/addPassword");
    }

    @Test
    void graphProviderBuildsTokenUrl() {
        var provider = new GraphIdentityProvider(
                "https://graph.microsoft.com", "tenant-1", "client-1", "secret-1");
        assertThat(provider.buildTokenUrl())
                .isEqualTo("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
    }

    @Test
    void successResultIsSuccess() {
        var result = IdentityResult.success("done", java.util.Map.of("key", "val"));
        assertThat(result.success()).isTrue();
        assertThat(result.details()).isEqualTo("done");
        assertThat(result.errorReason()).isNull();
        assertThat(result.retryable()).isFalse();
    }

    @Test
    void failureResultIsNotSuccess() {
        var result = IdentityResult.failure("bad", true);
        assertThat(result.success()).isFalse();
        assertThat(result.errorReason()).isEqualTo("bad");
        assertThat(result.retryable()).isTrue();
    }
}
