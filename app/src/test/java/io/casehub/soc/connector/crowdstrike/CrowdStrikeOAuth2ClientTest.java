package io.casehub.soc.connector.crowdstrike;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CrowdStrikeOAuth2ClientTest {

    @Test
    void requestsTokenOnFirstCall() {
        var client = new CrowdStrikeOAuth2Client(
                "https://fake.crowdstrike.com", "client-id", "client-secret");

        assertThatThrownBy(client::getAccessToken)
                .isInstanceOf(CrowdStrikeAuthException.class);
    }

    @Test
    void cachedTokenReturnedWithinTtl() {
        var client = new CrowdStrikeOAuth2Client(
                "https://fake.crowdstrike.com", "client-id", "client-secret");

        client.setCachedToken("cached-token", Instant.now().plus(Duration.ofMinutes(10)));

        assertThat(client.getAccessToken()).isEqualTo("cached-token");
    }

    @Test
    void expiredTokenTriggersRefresh() {
        var client = new CrowdStrikeOAuth2Client(
                "https://fake.crowdstrike.com", "client-id", "client-secret");

        client.setCachedToken("old-token", Instant.now().minus(Duration.ofMinutes(1)));

        assertThatThrownBy(client::getAccessToken)
                .isInstanceOf(CrowdStrikeAuthException.class);
    }

    @Test
    void tokenWithin60sBufferTriggersRefresh() {
        var client = new CrowdStrikeOAuth2Client(
                "https://fake.crowdstrike.com", "client-id", "client-secret");

        client.setCachedToken("almost-expired", Instant.now().plus(Duration.ofSeconds(30)));

        assertThatThrownBy(client::getAccessToken)
                .isInstanceOf(CrowdStrikeAuthException.class);
    }

    @Test
    void blankClientIdThrowsOnConstruction() {
        assertThatThrownBy(() ->
                new CrowdStrikeOAuth2Client("https://fake.crowdstrike.com", "", "secret"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("client-id");
    }

    @Test
    void unconfiguredThrowsOnGetToken() {
        var client = CrowdStrikeOAuth2Client.unconfigured();

        assertThatThrownBy(client::getAccessToken)
                .isInstanceOf(CrowdStrikeAuthException.class)
                .hasMessageContaining("not configured");
    }
}
