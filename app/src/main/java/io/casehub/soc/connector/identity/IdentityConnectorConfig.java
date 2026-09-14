package io.casehub.soc.connector.identity;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

@ApplicationScoped
public class IdentityConnectorConfig {

    @Produces
    @Singleton
    public IdentityProvider identityProvider(
            @ConfigProperty(name = "casehub.soc.identity.provider",
                             defaultValue = "okta") String providerType,
            @ConfigProperty(name = "casehub.soc.identity.api-base",
                             defaultValue = "") String apiBase,
            @ConfigProperty(name = "casehub.soc.identity.api-token") Optional<String> apiToken,
            @ConfigProperty(name = "casehub.soc.identity.tenant-id") Optional<String> tenantId,
            @ConfigProperty(name = "casehub.soc.identity.client-id") Optional<String> clientId,
            @ConfigProperty(name = "casehub.soc.identity.client-secret") Optional<String> clientSecret) {

        return switch (providerType) {
            case "okta" -> {
                if (apiToken.isEmpty() || apiToken.get().isBlank()) {
                    yield IdentityProvider.unconfigured();
                }
                yield new OktaIdentityProvider(apiBase, apiToken.get());
            }
            case "graph" -> {
                if (clientId.isEmpty() || clientId.get().isBlank()
                        || clientSecret.isEmpty() || clientSecret.get().isBlank()
                        || tenantId.isEmpty() || tenantId.get().isBlank()) {
                    yield IdentityProvider.unconfigured();
                }
                yield new GraphIdentityProvider(
                        apiBase.isBlank() ? "https://graph.microsoft.com" : apiBase,
                        tenantId.get(), clientId.get(), clientSecret.get());
            }
            default -> IdentityProvider.unconfigured();
        };
    }
}
