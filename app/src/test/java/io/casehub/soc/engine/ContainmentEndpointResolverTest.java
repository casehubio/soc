package io.casehub.soc.engine;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContainmentEndpointResolverTest {

    @Test
    void resolvesConfiguredEndpoint() {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of(
                "casehub.soc.containment.endpoints.crowdstrike.url", "http://cs:8080/containment",
                "casehub.soc.containment.endpoints.crowdstrike.method", "POST",
                "casehub.soc.containment.endpoints.crowdstrike.timeout-seconds", "30"
        ));

        ContainmentEndpoint ep = resolver.resolve("crowdstrike");
        assertThat(ep.url()).isEqualTo("http://cs:8080/containment");
        assertThat(ep.method()).isEqualTo("POST");
        assertThat(ep.timeoutSeconds()).isEqualTo(30);
    }

    @Test
    void usesDefaultsWhenMethodAndTimeoutMissing() {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of(
                "casehub.soc.containment.endpoints.sim.url", "http://localhost:8080/sim/containment"
        ));

        ContainmentEndpoint ep = resolver.resolve("sim");
        assertThat(ep.method()).isEqualTo("POST");
        assertThat(ep.timeoutSeconds()).isEqualTo(30);
    }

    @Test
    void throwsOnUnknownTag() {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of());

        assertThatThrownBy(() -> resolver.resolve("nonexistent"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("nonexistent");
    }

    @Test
    void resolvesMultipleEndpoints() {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of(
                "casehub.soc.containment.endpoints.crowdstrike.url", "http://cs:8080/containment",
                "casehub.soc.containment.endpoints.paloalto.url", "http://pa:8080/containment",
                "casehub.soc.containment.endpoints.paloalto.timeout-seconds", "15"
        ));

        assertThat(resolver.resolve("crowdstrike").url()).isEqualTo("http://cs:8080/containment");
        assertThat(resolver.resolve("paloalto").timeoutSeconds()).isEqualTo(15);
    }

    @Test
    void ignoresEntriesWithoutUrl() {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of(
                "casehub.soc.containment.endpoints.nourl.method", "POST",
                "casehub.soc.containment.endpoints.nourl.timeout-seconds", "10"
        ));

        assertThatThrownBy(() -> resolver.resolve("nourl"))
                .isInstanceOf(IllegalStateException.class);
    }
}
