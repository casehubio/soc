package io.casehub.soc.engine;

import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PathParam;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.soc.rest.dto.AgentTrustResponse;
import io.casehub.soc.rest.dto.KpiResponse;
import io.casehub.soc.rest.dto.RoutingDecisionResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;

@McpDomain(value = "soc/trust", basePath = "/api/soc/trust")
@ApplicationScoped
public class SocTrustApi {

    @Inject SocTrustService trustService;

    @PlatformQuery("Get trust score and dimensions for an agent")
    @RestPath("/{agentId}")
    public AgentTrustResponse getAgentTrust(@PathParam String agentId) {
        return trustService.getAgentTrust(agentId);
    }

    @PlatformQuery("Get fleet-wide trust KPIs")
    @RestPath("/fleet-kpis")
    public List<KpiResponse> getFleetKpis() {
        return trustService.getFleetKpis();
    }

    @PlatformQuery("Get routing rationale for a case")
    @RestPath("/routing/{caseId}")
    public List<RoutingDecisionResponse> getRoutingRationale(@PathParam UUID caseId) {
        return trustService.getRoutingRationale(caseId);
    }
}
