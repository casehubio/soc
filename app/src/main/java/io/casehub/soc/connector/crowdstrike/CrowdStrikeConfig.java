package io.casehub.soc.connector.crowdstrike;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

@ApplicationScoped
public class CrowdStrikeConfig {

    @Produces
    @Singleton
    public CrowdStrikeOAuth2Client crowdStrikeOAuth2Client(
            @ConfigProperty(name = "casehub.soc.crowdstrike.api-base",
                             defaultValue = "https://api.crowdstrike.com") String apiBase,
            @ConfigProperty(name = "casehub.soc.crowdstrike.client-id") Optional<String> clientId,
            @ConfigProperty(name = "casehub.soc.crowdstrike.client-secret") Optional<String> clientSecret) {
        if (clientId.isEmpty() || clientId.get().isBlank()
                || clientSecret.isEmpty() || clientSecret.get().isBlank()) {
            return CrowdStrikeOAuth2Client.unconfigured();
        }
        return new CrowdStrikeOAuth2Client(apiBase, clientId.get(), clientSecret.get());
    }
}
