package io.casehub.soc.engine;

import io.casehub.eidos.api.spi.AgentDescriptorRegistrar;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SocAgentRegistrarTest {

    @Inject
    Instance<AgentDescriptorRegistrar> registrars;

    @Test
    void registrarIsDiscovered() {
        var socRegistrar = registrars.stream()
            .filter(r -> r instanceof SocAgentRegistrar)
            .findFirst();
        assertTrue(socRegistrar.isPresent(), "SocAgentRegistrar should be discovered by CDI");
    }

    @Test
    void descriptorsReturnsSix() {
        var registrar = registrars.stream()
            .filter(r -> r instanceof SocAgentRegistrar)
            .findFirst().orElseThrow();
        var descriptors = registrar.descriptors();
        assertEquals(6, descriptors.size());
    }

    @Test
    void allDescriptorsHaveValidAgentIds() {
        var registrar = registrars.stream()
            .filter(r -> r instanceof SocAgentRegistrar)
            .findFirst().orElseThrow();
        for (var d : registrar.descriptors()) {
            assertNotNull(d.agentId());
            assertTrue(d.agentId().startsWith("soc:"),
                "Agent ID should start with soc: prefix, was: " + d.agentId());
        }
    }
}
