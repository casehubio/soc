package io.casehub.soc.connector.identity;

import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.ext.web.client.HttpResponse;
import io.vertx.ext.web.client.WebClient;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class GraphIdentityProvider implements IdentityProvider {

    private static final Logger LOG = Logger.getLogger(GraphIdentityProvider.class);
    private static final Duration EXPIRY_BUFFER = Duration.ofSeconds(60);

    private final String apiBase;
    private final String tokenBase;
    private final String tenantId;
    private final String clientId;
    private final String clientSecret;
    private final WebClient webClient;

    private volatile String cachedToken;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    public GraphIdentityProvider(String apiBase, String tenantId,
                                  String clientId, String clientSecret, Vertx vertx) {
        this(apiBase, "https://login.microsoftonline.com", tenantId, clientId, clientSecret, vertx);
    }

    GraphIdentityProvider(String apiBase, String tokenBase, String tenantId,
                           String clientId, String clientSecret) {
        this(apiBase, tokenBase, tenantId, clientId, clientSecret, Vertx.vertx());
    }

    private GraphIdentityProvider(String apiBase, String tokenBase, String tenantId,
                                   String clientId, String clientSecret, Vertx vertx) {
        this.apiBase = apiBase;
        this.tokenBase = tokenBase;
        this.tenantId = tenantId;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.webClient = WebClient.create(vertx);
    }

    @Override
    public IdentityResult disableAccount(String userId) {
        String token = getAccessToken();
        HttpResponse<Buffer> response = patch(buildDisableUrl(userId), token,
                "{\"accountEnabled\":false}");
        return handleResponse(response, "User " + userId + " disabled via graph",
                Map.of("provider", "graph", "identity_user_id", userId));
    }

    @Override
    public IdentityResult revokeSessions(String userId) {
        String token = getAccessToken();
        HttpResponse<Buffer> response = post(buildRevokeUrl(userId), token, null);
        return handleResponse(response, "Sessions revoked for " + userId + " via graph",
                Map.of("provider", "graph", "identity_user_id", userId));
    }

    @Override
    public IdentityResult rotateApiKey(String appId) {
        String token = getAccessToken();
        HttpResponse<Buffer> response = post(buildRotateUrl(appId), token,
                "{\"passwordCredential\":{\"displayName\":\"casehub-rotated\"}}");
        String keyId = "";
        if (response.statusCode() >= 200 && response.statusCode() < 300
                && response.bodyAsString() != null) {
            try {
                var json = response.bodyAsJsonObject();
                keyId = json.getString("keyId", "");
            } catch (Exception ignored) {}
        }
        return handleResponse(response, "API key rotated for " + appId + " via graph",
                Map.of("provider", "graph", "identity_key_id", keyId));
    }

    @Override
    public IdentityResult healthCheck() {
        try {
            getAccessToken();
            return IdentityResult.success("graph reachable", Map.of("provider", "graph"));
        } catch (Exception e) {
            return IdentityResult.failure("graph unreachable: " + e.getMessage(), true);
        }
    }

    @Override
    public String providerName() {
        return "graph";
    }

    String buildDisableUrl(String userId) {
        return apiBase + "/v1.0/users/" + userId;
    }

    String buildRevokeUrl(String userId) {
        return apiBase + "/v1.0/users/" + userId + "/revokeSignInSessions";
    }

    String buildRotateUrl(String appId) {
        return apiBase + "/v1.0/applications/" + appId + "/addPassword";
    }

    String buildTokenUrl() {
        return tokenBase + "/" + tenantId + "/oauth2/v2.0/token";
    }

    String getAccessToken() {
        if (cachedToken != null && Instant.now().plus(EXPIRY_BUFFER).isBefore(tokenExpiry)) {
            return cachedToken;
        }
        return refreshToken();
    }

    private String refreshToken() {
        String url = buildTokenUrl();
        String body = "client_id=" + clientId
                + "&client_secret=" + clientSecret
                + "&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default"
                + "&grant_type=client_credentials";
        try {
            HttpResponse<Buffer> response = webClient
                    .postAbs(url)
                    .putHeader("Content-Type", "application/x-www-form-urlencoded")
                    .sendBuffer(Buffer.buffer(body))
                    .toCompletionStage().toCompletableFuture()
                    .get(10, TimeUnit.SECONDS);

            if (response.statusCode() != 200) {
                throw new IdentityApiException(
                        "graph OAuth2 token request failed: HTTP " + response.statusCode(),
                        response.statusCode());
            }

            var json = response.bodyAsJsonObject();
            String token = json.getString("access_token");
            int expiresIn = json.getInteger("expires_in", 3599);
            cachedToken = token;
            tokenExpiry = Instant.now().plus(Duration.ofSeconds(expiresIn));
            LOG.infof("Graph OAuth2 token refreshed (expires in %ds)", expiresIn);
            return token;
        } catch (IdentityApiException e) {
            throw e;
        } catch (Exception e) {
            throw new IdentityApiException(
                    "graph OAuth2 token request failed: " + e.getMessage(), e);
        }
    }

    void setCachedToken(String token, Instant expiry) {
        this.cachedToken = token;
        this.tokenExpiry = expiry;
    }

    private IdentityResult handleResponse(HttpResponse<Buffer> response, String successMsg,
                                            Map<String, Object> metadata) {
        int status = response.statusCode();
        if (status >= 200 && status < 300) {
            return IdentityResult.success(successMsg, metadata);
        }
        if (status == 401) {
            throw new IdentityApiException("graph authentication failed", 401);
        }
        if (status == 404) {
            throw new IdentityApiException("graph: user/app not found", 404);
        }
        if (status == 429) {
            throw new IdentityApiException("graph rate limited", 429);
        }
        if (status >= 500) {
            throw new IdentityApiException("graph server error: " + status, status);
        }
        throw new IdentityApiException("graph error: " + status, status);
    }

    private HttpResponse<Buffer> post(String url, String token, String body) {
        try {
            var req = webClient.postAbs(url)
                    .putHeader("Authorization", "Bearer " + token)
                    .putHeader("Accept", "application/json");
            if (body != null) {
                req.putHeader("Content-Type", "application/json");
                return req.sendBuffer(Buffer.buffer(body))
                        .toCompletionStage().toCompletableFuture()
                        .get(30, TimeUnit.SECONDS);
            }
            return req.send().toCompletionStage().toCompletableFuture()
                    .get(30, TimeUnit.SECONDS);
        } catch (IdentityApiException e) {
            throw e;
        } catch (Exception e) {
            throw new IdentityApiException("graph unreachable: " + e.getMessage(), e);
        }
    }

    private HttpResponse<Buffer> patch(String url, String token, String body) {
        try {
            return webClient.patchAbs(url)
                    .putHeader("Authorization", "Bearer " + token)
                    .putHeader("Content-Type", "application/json")
                    .putHeader("Accept", "application/json")
                    .sendBuffer(Buffer.buffer(body))
                    .toCompletionStage().toCompletableFuture()
                    .get(30, TimeUnit.SECONDS);
        } catch (IdentityApiException e) {
            throw e;
        } catch (Exception e) {
            throw new IdentityApiException("graph unreachable: " + e.getMessage(), e);
        }
    }
}
