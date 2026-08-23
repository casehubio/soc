package io.casehub.soc.rest;

import io.casehub.ledger.runtime.repository.ActorTrustScoreRepository;
import io.casehub.soc.domain.SocAgentDescriptors;
import io.casehub.soc.domain.SocTrustDimensions;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/soc/trust")
@ApplicationScoped
public class SocTrustResource {

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    @Inject ActorTrustScoreRepository trustRepo;
    @Inject
            io.casehub.ledger.repository.CaseLedgerEntryRepository ledgerRepo;


    @GET
    @Path("/{agentId}")
    public Map<String, Object> getAgentTrust(@PathParam("agentId") String agentId) {
        var descriptor = SocAgentDescriptors.descriptorsByWorkerName()
            .get(agentId.replace("soc:", ""));
        var result = new LinkedHashMap<String, Object>();
        result.put("agentId", agentId);
        result.put("name", descriptor != null ? descriptor.name() : agentId);
        result.put("capability", descriptor != null ? descriptor.capabilities().getFirst().name() : "unknown");
        result.put("agentType", descriptor != null && descriptor.modelFamily() != null ? "LLM" : "RULE");

        var globalScore = trustRepo.findByActorId(agentId);
        result.put("globalTrustScore", globalScore.map(s -> s.trustScore).orElse(0.0));
        result.put("decisionCount", globalScore.map(s -> s.decisionCount).orElse(0));
        result.put("lastComputedAt", globalScore.map(s -> s.lastComputedAt).orElse(null));

        var dimensions = new ArrayList<Map<String, Object>>();
        for (String dim : List.of(SocTrustDimensions.TRIAGE_ACCURACY, SocTrustDimensions.CONTAINMENT_APPROPRIATENESS)) {
            var dimScore = trustRepo.findDimensionScore(agentId, dim);
            var d = new LinkedHashMap<String, Object>();
            d.put("key", dim);
            d.put("score", dimScore.map(s -> (Object) s.trustScore).orElse(null));
            d.put("decisionCount", dimScore.map(s -> s.decisionCount).orElse(0));
            dimensions.add(d);
        }
        result.put("dimensions", dimensions);
        return result;
    }

    @GET
    @Path("/fleet-kpis")
    public List<Map<String, Object>> getFleetKpis() {
        var socAgentIds = SocAgentDescriptors.all().stream()
            .map(d -> d.agentId())
            .toList();

        var globalScores = socAgentIds.stream()
            .map(trustRepo::findByActorId)
            .filter(java.util.Optional::isPresent)
            .map(java.util.Optional::get)
            .toList();

        double meanTrust = globalScores.stream()
            .mapToDouble(s -> s.trustScore)
            .average().orElse(0.0);
        int totalObservations = globalScores.stream()
            .mapToInt(s -> s.decisionCount)
            .sum();
        long agentCount = SocAgentDescriptors.all().size();

        return List.of(
            Map.of("label", "Mean Trust", "value", String.format("%.2f", meanTrust), "unit", "", "trend", List.of()),
            Map.of("label", "Total Observations", "value", totalObservations, "unit", "", "trend", List.of()),
            Map.of("label", "Fleet Size", "value", agentCount, "unit", "agents", "trend", List.of())
        );
    }

    @GET
    @Path("/routing/{caseId}")
    public List<Map<String, Object>> getRoutingRationale(@PathParam("caseId") UUID caseId) {
        List<io.casehub.ledger.model.WorkerDecisionEntry> entries;
        try {
            entries = ledgerRepo.findWorkerDecisionsByCaseId(caseId);
        } catch (Exception e) {
            return List.of();
        }
        if (entries.isEmpty()) {return List.of();}

        var descriptors = SocAgentDescriptors.descriptorsByWorkerName();
        var result      = new ArrayList<Map<String, Object>>();

        for (var entry : entries) {
            var rationale = new LinkedHashMap<String, Object>();
            rationale.put("capabilityTag", entry.capabilityTag);

            if (entry.routingRationale != null) {
                try {
                    var ctx = MAPPER.readValue(entry.routingRationale,
                                               io.casehub.engine.common.spi.event.SelectionContext.class);

                    rationale.put("strategyId", ctx.strategyId());
                    rationale.put("selected", enrichCandidate(ctx.selected(), entry.workerId, entry));
                    rationale.put("alternatives", ctx.alternatives().stream()
                                                     .map(alt -> enrichCandidate(alt, alt.workerId(), entry))
                                                     .toList());
                    rationale.put("policy", buildPolicy(entry));
                } catch (Exception e) {
                    rationale.put("strategyId", "trust-weighted");
                    rationale.put("selected", buildMinimalCandidate(entry));
                    rationale.put("alternatives", List.of());
                    rationale.put("policy", buildPolicy(entry));
                }
            } else {
                rationale.put("strategyId", "trust-weighted");
                rationale.put("selected", buildMinimalCandidate(entry));
                rationale.put("alternatives", List.of());
                rationale.put("policy", buildPolicy(entry));
            }
            result.add(rationale);
        }
        return result;
    }

    private Map<String, Object> enrichCandidate(
            io.casehub.engine.common.spi.event.SelectionContext.SelectedCandidate candidate,
            String workerId,
            io.casehub.ledger.model.WorkerDecisionEntry entry) {
        var actorId = workerId.startsWith("soc:") ? workerId : "soc:" + workerId;
        var score = trustRepo.findCapabilityScore(actorId, entry.capabilityTag).orElse(null);
        var trustScore = actorId.equals(entry.workerId)
                         ? entry.trustScoreAtRouting
                         : (score != null ? (Double) score.trustScore : null);
        int observations = score != null ? score.decisionCount : 0;
        String phase = observations < 5 ? "BOOTSTRAP"
                                        : (trustScore != null && entry.thresholdApplied != null && trustScore < entry.thresholdApplied)
                                          ? "BORDERLINE" : "QUALIFIED";

        var c = new LinkedHashMap<String, Object>();
        c.put("workerId", actorId);
        c.put("trustScore", trustScore);
        c.put("workloadScore", 0.0);
        c.put("phase", phase);
        c.put("observations", observations);
        c.put("finalScore", candidate.score());
        c.put("exclusionReason", null);
        c.put("rationale", candidate.reason());
        c.put("additionalScores", null);
        return c;
    }

    private Map<String, Object> buildMinimalCandidate(io.casehub.ledger.model.WorkerDecisionEntry entry) {
        var c = new LinkedHashMap<String, Object>();
        c.put("workerId", entry.workerId);
        c.put("trustScore", entry.trustScoreAtRouting);
        c.put("workloadScore", 0.0);
        c.put("phase", "QUALIFIED");
        c.put("observations", 0);
        c.put("finalScore", entry.trustScoreAtRouting != null ? entry.trustScoreAtRouting : 0.0);
        c.put("exclusionReason", null);
        c.put("rationale", null);
        c.put("additionalScores", null);
        return c;
    }

    private Map<String, Object> buildPolicy(io.casehub.ledger.model.WorkerDecisionEntry entry) {
        var p = new LinkedHashMap<String, Object>();
        p.put("threshold", entry.thresholdApplied != null ? entry.thresholdApplied : 0.5);
        p.put("borderlineMargin", 0.1);
        p.put("blendFactor", 0.7);
        p.put("minimumObservations", 5);
        p.put("qualityFloors", Map.of());
        p.put("cbrWeight", 0.3);
        p.put("bootstrapEscalationRequired", false);
        return p;
    }

}
