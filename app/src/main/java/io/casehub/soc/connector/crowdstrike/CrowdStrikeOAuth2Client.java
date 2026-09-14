package io.casehub.soc.connector.crowdstrike;

import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.ext.web.client.HttpResponse;
import io.vertx.ext.web.client.WebClient;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

public class CrowdStrikeOAuth2Client {

    private static final Logger LOG = Logger.getLogger(CrowdStrikeOAuth2Client.class);
    private static final Duration EXPIRY_BUFFER = Duration.ofSeconds(60);

    private final String apiBase;
    private final String clientId;
    private final String clientSecret;
    private final WebClient webClient;

    private volatile String cachedToken;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    public CrowdStrikeOAuth2Client(String apiBase, String clientId, String clientSecret, Vertx vertx) {
        if (clientId == null || clientId.isBlank()) {
            throw new IllegalArgumentException("CrowdStrike client-id must not be blank");
        }
        if (clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalArgumentException("CrowdStrike client-secret must not be blank");
        }
        this.apiBase = apiBase;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.webClient = WebClient.create(vertx);
    }

    private CrowdStrikeOAuth2Client() {
        this.apiBase = "";
        this.clientId = "";
        this.clientSecret = "";
        this.webClient = null;
    }

    public static CrowdStrikeOAuth2Client unconfigured() {
        return new CrowdStrikeOAuth2Client();
    }

    public String getAccessToken() {
        if (clientId.isBlank()) {
            throw new CrowdStrikeAuthException(
                    "CrowdStrike not configured — set client-id and client-secret");
        }
        if (cachedToken != null && Instant.now().plus(EXPIRY_BUFFER).isBefore(tokenExpiry)) {
            return cachedToken;
        }
        return refreshToken();
    }

    private String refreshToken() {
        String url = apiBase + "/oauth2/token";
        String body = "client_id=" + clientId + "&client_secret=" + clientSecret;

        try {
            HttpResponse<Buffer> response = webClient
                    .postAbs(url)
                    .putHeader("Content-Type", "application/x-www-form-urlencoded")
                    .sendBuffer(Buffer.buffer(body))
                    .toCompletionStage()
                    .toCompletableFuture()
                    .get(10, TimeUnit.SECONDS);

            if (response.statusCode() != 200) {
                throw new CrowdStrikeAuthException(
                        "OAuth2 token request failed: HTTP " + response.statusCode());
            }

            var json = response.bodyAsJsonObject();
            String token = json.getString("access_token");
            int expiresIn = json.getInteger("expires_in", 1799);

            cachedToken = token;
            tokenExpiry = Instant.now().plus(Duration.ofSeconds(expiresIn));

            LOG.infof("CrowdStrike OAuth2 token refreshed (expires in %ds)", expiresIn);
            return token;
        } catch (CrowdStrikeAuthException e) {
            throw e;
        } catch (Exception e) {
            throw new CrowdStrikeAuthException(
                    "OAuth2 token request failed: " + e.getMessage(), e);
        }
    }

    void setCachedToken(String token, Instant expiry) {
        this.cachedToken = token;
        this.tokenExpiry = expiry;
    }
}
