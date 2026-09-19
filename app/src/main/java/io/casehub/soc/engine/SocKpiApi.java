package io.casehub.soc.engine;

import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.engine.common.spi.query.CaseInstanceQuery;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.rest.dto.KpiResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;

@McpDomain(value = "soc/kpis", basePath = "/api/soc/kpis")
@ApplicationScoped
public class SocKpiApi {

    @Inject CaseInstanceRepository repository;
    @Inject CurrentPrincipal currentPrincipal;

    @PlatformQuery("Get SOC key performance indicators")
    @RestPath("/")
    public List<KpiResponse> getKpis() {
        String tenancyId = currentPrincipal.tenancyId();
        var allQuery = CaseInstanceQuery.builder()
            .name(SocCaseTypes.INCIDENT_INVESTIGATION).build();
        long total = repository.count(allQuery, tenancyId);

        return List.of(
            new KpiResponse("Open Incidents", total, ""),
            new KpiResponse("Total Incidents", total, ""),
            new KpiResponse("MTTR", "—", "min"),
            new KpiResponse("P1 SLA", "—", "%"));
    }
}
