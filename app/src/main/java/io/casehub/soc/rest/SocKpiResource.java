package io.casehub.soc.rest;

import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.engine.common.spi.query.CaseInstanceQuery;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.soc.domain.SocCaseTypes;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

import java.util.List;
import java.util.Map;

@Path("/api/soc/kpis")
@ApplicationScoped
public class SocKpiResource {

    @Inject CaseInstanceRepository repository;
    @Inject CurrentPrincipal currentPrincipal;

    @GET
    public List<Map<String, Object>> getKpis() {
        String tenancyId = currentPrincipal.tenancyId();
        var allQuery = CaseInstanceQuery.builder()
                .name(SocCaseTypes.INCIDENT_INVESTIGATION).build();
        long total = repository.count(allQuery, tenancyId);

        return List.of(
            Map.of("label", "Open Incidents", "value", total, "unit", "", "trend", List.of()),
            Map.of("label", "Total Incidents", "value", total, "unit", "", "trend", List.of()),
            Map.of("label", "MTTR", "value", "—", "unit", "min", "trend", List.of()),
            Map.of("label", "P1 SLA", "value", "—", "unit", "%", "trend", List.of())
        );
    }
}
