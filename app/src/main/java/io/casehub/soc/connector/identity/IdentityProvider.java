package io.casehub.soc.connector.identity;

public interface IdentityProvider {

    IdentityResult disableAccount(String userId);

    IdentityResult revokeSessions(String userId);

    IdentityResult rotateApiKey(String appId);

    IdentityResult healthCheck();

    String providerName();

    static IdentityProvider unconfigured() {
        return new IdentityProvider() {
            @Override public IdentityResult disableAccount(String userId) {
                throw new IdentityApiException("Identity provider not configured");
            }
            @Override public IdentityResult revokeSessions(String userId) {
                throw new IdentityApiException("Identity provider not configured");
            }
            @Override public IdentityResult rotateApiKey(String appId) {
                throw new IdentityApiException("Identity provider not configured");
            }
            @Override public IdentityResult healthCheck() {
                throw new IdentityApiException("Identity provider not configured");
            }
            @Override public String providerName() { return "unconfigured"; }
        };
    }
}
