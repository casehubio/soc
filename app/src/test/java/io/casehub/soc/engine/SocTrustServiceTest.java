package io.casehub.soc.engine;

import io.casehub.soc.rest.dto.AgentTrustResponse;
import io.casehub.soc.rest.dto.KpiResponse;
import io.casehub.soc.rest.dto.RoutingDecisionResponse;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SocTrustServiceTest {

    @Inject SocTrustService trustService;

    @Test
    void getAgentTrust_knownAgent_returnsTypedResponse() {
        AgentTrustResponse result = trustService.getAgentTrust("soc:rule-ioc-enrichment");
        assertNotNull(result);
        assertEquals("soc:rule-ioc-enrichment", result.agentId());
        assertNotNull(result.name());
        assertNotNull(result.dimensions());
    }

    @Test
    void getAgentTrust_unknownAgent_returnsDefaultShape() {
        AgentTrustResponse result = trustService.getAgentTrust("soc:nonexistent");
        assertNotNull(result);
        assertEquals("soc:nonexistent", result.agentId());
        assertEquals(0.0, result.globalTrustScore());
    }

    @Test
    void getFleetKpis_returnsNonEmptyList() {
        List<KpiResponse> result = trustService.getFleetKpis();
        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals("Mean Trust", result.getFirst().label());
    }

    @Test
    void getRoutingRationale_unknownCase_returnsEmptyList() {
        List<RoutingDecisionResponse> result = trustService.getRoutingRationale(UUID.randomUUID());
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }
}
