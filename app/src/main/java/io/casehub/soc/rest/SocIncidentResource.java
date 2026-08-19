package io.casehub.soc.rest;

import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.engine.common.spi.query.CaseInstanceQuery;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.rest.dto.IncidentSummaryDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/soc/incidents")
@ApplicationScoped
public class SocIncidentResource {

    @Inject CaseInstanceRepository repository;
    @Inject CurrentPrincipal currentPrincipal;

    @GET
    public Map<String, Object> listIncidents(
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size) {
        String tenancyId = currentPrincipal.tenancyId();
        CaseInstanceQuery query = CaseInstanceQuery.builder()
                .name(SocCaseTypes.INCIDENT_INVESTIGATION)
                .page(page != null ? page : 0)
                .size(size != null ? size : 50)
                .build();
        List<IncidentSummaryDto> entities = repository.query(query, tenancyId)
                .stream().map(this::toSummary).toList();
        long total = repository.count(query, tenancyId);
        return Map.of("entities", entities, "totalCount", total);
    }

    @GET @Path("/{id}")
    public CaseInstance getIncident(@PathParam("id") UUID id) {
        return repository.findByUuid(id, currentPrincipal.tenancyId());
    }

    @GET @Path("/{id}/timeline")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getTimeline(@PathParam("id") UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null || ci.getCaseContext() == null) return List.of();
        Object trail = ci.getCaseContext().get("auditTrail");
        if (trail instanceof List<?> list) {
            return (List<Map<String, Object>>) (List<?>) list;
        }
        return List.of();
    }

    @GET @Path("/{id}/channels")
    public List<Map<String, Object>> getChannels(@PathParam("id") UUID id) {
        // Stub — returns empty until Qhorus channel integration is wired.
        return List.of();
    }

    @GET @Path("/{id}/iocs")
    public Map<String, Object> getIocs(@PathParam("id") UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null || ci.getCaseContext() == null) return Map.of("iocs", List.of());
        var ctx = ci.getCaseContext();
        Object enrichment = ctx.get("iocEnrichment");
        if (enrichment == null) return Map.of("iocs", List.of());
        if (enrichment instanceof Map<?, ?> m) {
            Object iocs = m.get("iocs");
            return Map.of("iocs", iocs != null ? iocs : List.of());
        }
        return Map.of("iocs", List.of());
    }

    @GET @Path("/{id}/attck")
    public Map<String, Object> getAttck(@PathParam("id") UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null || ci.getCaseContext() == null) return Map.of("techniques", List.of());
        var ctx = ci.getCaseContext();
        Object mapping = ctx.get("attckMapping");
        if (mapping == null) return Map.of("techniques", List.of());
        if (mapping instanceof Map<?, ?> m) {
            Object techniques = m.get("techniques");
            return Map.of("techniques", techniques != null ? techniques : List.of());
        }
        return Map.of("techniques", List.of());
    }

    private IncidentSummaryDto toSummary(CaseInstance ci) {
        var ctx = ci.getCaseContext();
        return new IncidentSummaryDto(
                ci.getUuid(),
                ctx != null ? stringOrDefault(ctx, "incidentStatus", "UNKNOWN") : "UNKNOWN",
                ctx != null ? stringOrDefault(ctx, "alertSeverity", "UNKNOWN") : "UNKNOWN",
                ctx != null ? stringOrDefault(ctx, "alertSource", "unknown") : "unknown",
                ctx != null ? stringOrDefault(ctx, "incidentTitle", "Untitled Incident") : "Untitled Incident",
                ci.getCreatedAt());
    }

    static String stringOrDefault(io.casehub.api.context.CaseContext ctx, String key, String defaultValue) {
        String val = ctx.getString(key);
        return val != null ? val : defaultValue;
    }
}
