package io.casehub.soc.rest;

import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.soc.engine.cbr.SocCbrRetrieveService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/soc/cbr")
@ApplicationScoped
public class SocCbrResource {

    @Inject SocCbrRetrieveService cbrService;
    @Inject CaseInstanceRepository caseRepo;
    @Inject CurrentPrincipal currentPrincipal;

    @GET
    @Path("/similar/{caseId}")
    public Map<String, Object> getSimilar(@PathParam("caseId") UUID caseId) {
        String tenantId = currentPrincipal.tenancyId();
        CaseInstance ci = caseRepo.findByUuid(caseId, tenantId);
        if (ci == null || ci.getCaseContext() == null) {
            return Map.of("summary", emptySummary(), "incidents", List.of());
        }

        List<Map<String, Object>> raw = cbrService.retrieve(ci.getCaseContext().getData(), tenantId);
        List<Map<String, Object>> precedents = raw.stream().map(this::toPrecedent).toList();
        Map<String, Object> summary = computeSummary(precedents);

        return Map.of("summary", summary, "incidents", precedents);
    }

    private Map<String, Object> toPrecedent(Map<String, Object> raw) {
        var p = new LinkedHashMap<String, Object>();
        p.put("caseId", raw.get("caseId"));
        p.put("similarity", raw.get("similarityScore"));
        p.put("outcome", raw.getOrDefault("severityOutcome", "unknown"));
        Object durObj = raw.get("investigationDurationMinutes");
        p.put("resolutionTime", durObj != null ? durObj + "m" : "—");
        p.put("alertType", raw.get("alertType"));
        p.put("sourceSystem", raw.get("sourceSystem"));
        p.put("attckTechniqueIds", raw.get("attckTechniqueIds"));
        p.put("playbook", raw.get("playbook"));
        return p;
    }

    private Map<String, Object> computeSummary(List<Map<String, Object>> precedents) {
        if (precedents.isEmpty()) return emptySummary();

        var outcomes = new LinkedHashMap<String, Integer>();
        for (var p : precedents) {
            String outcome = String.valueOf(p.getOrDefault("outcome", "unknown"));
            outcomes.merge(outcome, 1, Integer::sum);
        }

        String dominant = outcomes.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey).orElse("unknown");
        int dominantCount = outcomes.getOrDefault(dominant, 0);

        return Map.of(
            "totalSimilar", precedents.size(),
            "outcomes", outcomes,
            "avgResolutionMinutes", 0,
            "dominantOutcome", dominant,
            "dominantOutcomePercent", precedents.isEmpty() ? 0 : (dominantCount * 100 / precedents.size())
        );
    }

    private Map<String, Object> emptySummary() {
        return Map.of(
            "totalSimilar", 0,
            "outcomes", Map.of(),
            "avgResolutionMinutes", 0,
            "dominantOutcome", "none",
            "dominantOutcomePercent", 0
        );
    }
}
