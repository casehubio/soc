package io.casehub.soc.connector.paloalto;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

@ApplicationScoped
public class PaloAltoConfig {

    @Produces
    @Singleton
    public PaloAltoApiClient paloAltoApiClient(
            @ConfigProperty(name = "casehub.soc.paloalto.api-base",
                             defaultValue = "https://firewall.corp.local") String apiBase,
            @ConfigProperty(name = "casehub.soc.paloalto.api-key") Optional<String> apiKey,
            @ConfigProperty(name = "casehub.soc.paloalto.vsys",
                             defaultValue = "vsys1") String vsys,
            @ConfigProperty(name = "casehub.soc.paloalto.device-name",
                             defaultValue = "localhost.localdomain") String deviceName,
            @ConfigProperty(name = "casehub.soc.paloalto.commit-poll-interval-ms",
                             defaultValue = "2000") long commitPollIntervalMs,
            @ConfigProperty(name = "casehub.soc.paloalto.commit-timeout-ms",
                             defaultValue = "60000") long commitTimeoutMs) {
        if (apiKey.isEmpty() || apiKey.get().isBlank()) {
            return PaloAltoApiClient.unconfigured();
        }
        return new PaloAltoApiClient(apiBase, apiKey.get(), vsys, deviceName,
                commitPollIntervalMs, commitTimeoutMs);
    }
}
