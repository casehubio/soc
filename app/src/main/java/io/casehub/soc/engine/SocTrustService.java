package io.casehub.soc.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.casehub.engine.common.spi.event.SelectionContext;
import io.casehub.ledger.model.WorkerDecisionEntry;
import io.casehub.ledger.repository.CaseLedgerEntryRepository;
import io.casehub.ledger.runtime.repository.ActorTrustScoreRepository;
import io.casehub.soc.domain.SocAgentDescriptors;
import io.casehub.soc.domain.SocTrustDimensions;
import io.casehub.soc.rest.dto.AgentTrustResponse;
import io.casehub.soc.rest.dto.KpiResponse;
import io.casehub.soc.rest.dto.RoutingCandidateResponse;
import io.casehub.soc.rest.dto.RoutingDecisionResponse;
import io.casehub.soc.rest.dto.RoutingPolicyResponse;
import io.casehub.soc.rest.dto.TrustDimensionResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class SocTrustService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Inject ActorTrustScoreRepository trustRepo;
    @Inject CaseLedgerEntryRepository ledgerRepo;

    public AgentTrustResponse getAgentTrust(String agentId) {
        var descriptor = SocAgentDescriptors.descriptorsByWorkerName()
            .get(agentId.replace("soc:", ""));
        var globalScore = trustRepo.findByActorId(agentId);

        var dimensions = List.of(
                SocTrustDimensions.TRIAGE_ACCURACY,
                SocTrustDimensions.CONTAINMENT_APPROPRIATENESS)
            .stream()
            .map(dim -> {
                var ds = trustRepo.findDimensionScore(agentId, dim);
                return new TrustDimensionResponse(dim,
                    ds.map(s -> s.trustScore).orElse(0.0),
                    ds.map(s -> (long) s.decisionCount).orElse(0L));
            }).toList();

        return new AgentTrustResponse(
            agentId,
            descriptor != null ? descriptor.name() : agentId,
            descriptor != null ? descriptor.capabilities().getFirst().name() : "unknown",
            descriptor != null && descriptor.modelFamily() != null ? "LLM" : "RULE",
            globalScore.map(s -> s.trustScore).orElse(0.0),
            globalScore.map(s -> (long) s.decisionCount).orElse(0L),
            globalScore.map(s -> s.lastComputedAt).orElse(null),
            dimensions);
    }

    public List<KpiResponse> getFleetKpis() {
        var socAgentIds = SocAgentDescriptors.all().stream()
            .map(d -> d.agentId()).toList();
        var globalScores = socAgentIds.stream()
            .map(trustRepo::findByActorId)
            .filter(Optional::isPresent).map(Optional::get).toList();

        double meanTrust = globalScores.stream()
            .mapToDouble(s -> s.trustScore).average().orElse(0.0);
        int totalObservations = globalScores.stream()
            .mapToInt(s -> s.decisionCount).sum();
        long agentCount = SocAgentDescriptors.all().size();

        return List.of(
            new KpiResponse("Mean Trust", String.format("%.2f", meanTrust), ""),
            new KpiResponse("Total Observations", totalObservations, ""),
            new KpiResponse("Fleet Size", agentCount, "agents"));
    }

    public List<RoutingDecisionResponse> getRoutingRationale(UUID caseId) {
        List<WorkerDecisionEntry> entries;
        try {
            entries = ledgerRepo.findWorkerDecisionsByCaseId(caseId);
        } catch (Exception e) {
            return List.of();
        }
        if (entries.isEmpty()) return List.of();

        var result = new ArrayList<RoutingDecisionResponse>();
        for (var entry : entries) {
            RoutingCandidateResponse selected;
            List<RoutingCandidateResponse> alternatives;
            String strategyId;

            if (entry.routingRationale != null) {
                try {
                    var ctx = MAPPER.readValue(entry.routingRationale, SelectionContext.class);
                    strategyId = ctx.strategyId();
                    selected = enrichCandidate(ctx.selected(), entry.workerId, entry);
                    alternatives = ctx.alternatives().stream()
                        .map(alt -> enrichCandidate(alt, alt.workerId(), entry))
                        .toList();
                } catch (Exception e) {
                    strategyId = "trust-weighted";
                    selected = buildMinimalCandidate(entry);
                    alternatives = List.of();
                }
            } else {
                strategyId = "trust-weighted";
                selected = buildMinimalCandidate(entry);
                alternatives = List.of();
            }

            result.add(new RoutingDecisionResponse(
                entry.capabilityTag, strategyId, selected, alternatives,
                buildPolicy(entry)));
        }
        return result;
    }

    private RoutingCandidateResponse enrichCandidate(
            SelectionContext.SelectedCandidate candidate,
            String workerId, WorkerDecisionEntry entry) {
        var actorId = workerId.startsWith("soc:") ? workerId : "soc:" + workerId;
        var score = trustRepo.findCapabilityScore(actorId, entry.capabilityTag).orElse(null);
        var trustScore = actorId.equals(entry.workerId)
            ? entry.trustScoreAtRouting
            : (score != null ? (Double) score.trustScore : null);
        int observations = score != null ? score.decisionCount : 0;
        String phase = observations < 5 ? "BOOTSTRAP"
            : (trustScore != null && entry.thresholdApplied != null
               && trustScore < entry.thresholdApplied)
              ? "BORDERLINE" : "QUALIFIED";

        return new RoutingCandidateResponse(actorId, trustScore, 0.0, phase,
            observations, candidate.score(), null, candidate.reason(), null);
    }

    private RoutingCandidateResponse buildMinimalCandidate(WorkerDecisionEntry entry) {
        return new RoutingCandidateResponse(entry.workerId,
            entry.trustScoreAtRouting, 0.0, "QUALIFIED", 0,
            entry.trustScoreAtRouting != null ? entry.trustScoreAtRouting : 0.0,
            null, null, null);
    }

    private RoutingPolicyResponse buildPolicy(WorkerDecisionEntry entry) {
        return new RoutingPolicyResponse(
            entry.thresholdApplied != null ? entry.thresholdApplied : 0.5,
            0.1, 0.7, 5, Map.of(), 0.3, false);
    }
}
