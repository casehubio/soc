package io.casehub.soc.connector.identity;

import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.ext.web.client.HttpResponse;
import io.vertx.ext.web.client.WebClient;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.concurrent.TimeUnit;

public class OktaIdentityProvider implements IdentityProvider {

    private static final Logger LOG = Logger.getLogger(OktaIdentityProvider.class);

    private final String apiBase;
    private final String apiToken;

    public OktaIdentityProvider(String apiBase, String apiToken) {
        this.apiBase = apiBase;
        this.apiToken = apiToken;
    }

    @Override
    public IdentityResult disableAccount(String userId) {
        HttpResponse<Buffer> response = post(buildDisableUrl(userId), null);
        return handleResponse(response, "User " + userId + " disabled via okta",
                Map.of("provider", "okta", "identity_user_id", userId));
    }

    @Override
    public IdentityResult revokeSessions(String userId) {
        HttpResponse<Buffer> response = delete(buildRevokeUrl(userId));
        return handleResponse(response, "Sessions revoked for " + userId + " via okta",
                Map.of("provider", "okta", "identity_user_id", userId));
    }

    @Override
    public IdentityResult rotateApiKey(String appId) {
        HttpResponse<Buffer> response = post(buildRotateUrl(appId), null);
        String keyId = "";
        if (response.statusCode() >= 200 && response.statusCode() < 300
                && response.bodyAsString() != null) {
            try {
                var json = response.bodyAsJsonObject();
                keyId = json.getString("kid", "");
            } catch (Exception ignored) {}
        }
        return handleResponse(response, "API key rotated for " + appId + " via okta",
                Map.of("provider", "okta", "identity_key_id", keyId));
    }

    @Override
    public IdentityResult healthCheck() {
        try {
            HttpResponse<Buffer> response = get(apiBase + "/api/v1/org");
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return IdentityResult.success("okta reachable", Map.of("provider", "okta"));
            }
            return IdentityResult.failure("okta health check failed: HTTP " + response.statusCode(), false);
        } catch (Exception e) {
            return IdentityResult.failure("okta unreachable: " + e.getMessage(), true);
        }
    }

    @Override
    public String providerName() {
        return "okta";
    }

    String buildDisableUrl(String userId) {
        return apiBase + "/api/v1/users/" + userId + "/lifecycle/suspend";
    }

    String buildRevokeUrl(String userId) {
        return apiBase + "/api/v1/users/" + userId + "/sessions";
    }

    String buildRotateUrl(String appId) {
        return apiBase + "/api/v1/apps/" + appId + "/credentials/keys/generate?validityYears=1";
    }

    private IdentityResult handleResponse(HttpResponse<Buffer> response, String successMsg,
                                            Map<String, Object> metadata) {
        int status = response.statusCode();
        if (status >= 200 && status < 300) {
            return IdentityResult.success(successMsg, metadata);
        }
        if (status == 401) {
            throw new IdentityApiException("okta authentication failed", 401);
        }
        if (status == 404) {
            throw new IdentityApiException("okta: user/app not found", 404);
        }
        if (status == 429) {
            throw new IdentityApiException("okta rate limited", 429);
        }
        if (status >= 500) {
            throw new IdentityApiException("okta server error: " + status, status);
        }
        throw new IdentityApiException("okta error: " + status, status);
    }

    private HttpResponse<Buffer> post(String url, String body) {
        try {
            WebClient client = WebClient.create(Vertx.vertx());
            var req = client.postAbs(url)
                    .putHeader("Authorization", "SSWS " + apiToken)
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
            throw new IdentityApiException("okta unreachable: " + e.getMessage(), e);
        }
    }

    private HttpResponse<Buffer> delete(String url) {
        try {
            WebClient client = WebClient.create(Vertx.vertx());
            return client.deleteAbs(url)
                    .putHeader("Authorization", "SSWS " + apiToken)
                    .putHeader("Accept", "application/json")
                    .send().toCompletionStage().toCompletableFuture()
                    .get(30, TimeUnit.SECONDS);
        } catch (IdentityApiException e) {
            throw e;
        } catch (Exception e) {
            throw new IdentityApiException("okta unreachable: " + e.getMessage(), e);
        }
    }

    private HttpResponse<Buffer> get(String url) {
        try {
            WebClient client = WebClient.create(Vertx.vertx());
            return client.getAbs(url)
                    .putHeader("Authorization", "SSWS " + apiToken)
                    .putHeader("Accept", "application/json")
                    .send().toCompletionStage().toCompletableFuture()
                    .get(10, TimeUnit.SECONDS);
        } catch (Exception e) {
            throw new IdentityApiException("okta unreachable: " + e.getMessage(), e);
        }
    }
}
