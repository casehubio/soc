package io.casehub.soc.engine;

import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PathParam;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.soc.engine.cbr.SocCbrRetrieveService;
import io.casehub.soc.rest.dto.CbrPrecedentResponse;
import io.casehub.soc.rest.dto.CbrSimilarResponse;
import io.casehub.soc.rest.dto.CbrSummaryResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@McpDomain(value = "soc/cbr", basePath = "/api/soc/cbr")
@ApplicationScoped
public class SocCbrApi {

    @Inject SocCbrRetrieveService cbrService;
    @Inject CaseInstanceRepository caseRepo;
    @Inject CurrentPrincipal currentPrincipal;

    @PlatformQuery("Find similar past incidents for a case")
    @RestPath("/similar/{caseId}")
    public CbrSimilarResponse getSimilarIncidents(@PathParam UUID caseId) {
        String tenantId = currentPrincipal.tenancyId();
        CaseInstance ci = caseRepo.findByUuid(caseId, tenantId);
        if (ci == null || ci.getCaseContext() == null) {
            return new CbrSimilarResponse(emptySummary(), List.of());
        }

        List<Map<String, Object>> raw =
            cbrService.retrieve(ci.getCaseContext().getData(), tenantId);
        List<CbrPrecedentResponse> precedents = raw.stream()
            .map(this::toPrecedent).toList();
        CbrSummaryResponse summary = computeSummary(precedents);

        return new CbrSimilarResponse(summary, precedents);
    }

    @SuppressWarnings("unchecked")
    private CbrPrecedentResponse toPrecedent(Map<String, Object> raw) {
        Object durObj = raw.get("investigationDurationMinutes");
        return new CbrPrecedentResponse(
            raw.get("caseId") instanceof UUID u ? u : null,
            raw.get("similarityScore") instanceof Number n ? n.doubleValue() : 0.0,
            String.valueOf(raw.getOrDefault("severityOutcome", "unknown")),
            durObj != null ? durObj + "m" : "—",
            raw.get("alertType") instanceof String s ? s : null,
            raw.get("sourceSystem") instanceof String s ? s : null,
            raw.get("attckTechniqueIds") instanceof List<?> l
                ? l.stream().map(String::valueOf).toList() : List.of(),
            raw.get("playbook") instanceof String s ? s : null);
    }

    private CbrSummaryResponse computeSummary(List<CbrPrecedentResponse> precedents) {
        if (precedents.isEmpty()) return emptySummary();
        var outcomes = new LinkedHashMap<String, Integer>();
        for (var p : precedents) {
            outcomes.merge(p.outcome(), 1, Integer::sum);
        }
        String dominant = outcomes.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey).orElse("unknown");
        int dominantCount = outcomes.getOrDefault(dominant, 0);
        return new CbrSummaryResponse(precedents.size(), outcomes, 0,
            dominant, precedents.isEmpty() ? 0 : (dominantCount * 100 / precedents.size()));
    }

    private CbrSummaryResponse emptySummary() {
        return new CbrSummaryResponse(0, Map.of(), 0, "none", 0);
    }
}
