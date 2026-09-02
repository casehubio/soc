package io.casehub.soc.worker;

import io.casehub.soc.domain.SocActionType;
import io.casehub.soc.worker.contract.ContainmentRecommendationOutput;
import io.casehub.worker.api.PlannedAction;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.LinkedHashMap;
import java.util.Map;

public final class RuleContainmentRecommendationWorker {

    private RuleContainmentRecommendationWorker() {}

    public static Worker create() {
        return Worker.builder()
                .name("rule-containment-rec")
                .capabilityName("containment-recommendation")
                .function((Map<String, Object> input) -> {
                    @SuppressWarnings("unchecked")
                    var alert = (Map<String, Object>) input.getOrDefault("alert", Map.of());
                    String severity = (String) alert.getOrDefault("severity", "MEDIUM");

                    @SuppressWarnings("unchecked")
                    var attckMapping = (Map<String, Object>) input.getOrDefault("attckMapping", Map.of());
                    String primaryTactic = (String) attckMapping.getOrDefault("primaryTactic", "INITIAL_ACCESS");

                    ContainmentRecommendationOutput decision =
                            ContainmentDecisionMatrix.decide(severity, primaryTactic);

                    var output = new LinkedHashMap<String, Object>();
                    output.put("recommendedAction", decision.recommendedAction());
                    output.put("riskScore", decision.riskScore());
                    output.put("confidenceScore", decision.confidenceScore());
                    output.put("rationale", decision.rationale());
                    output.put("actionParameters", decision.actionParameters());

                    if (decision.recommendedAction() == null) {
                        return WorkerResult.of(output);
                    }

                    var socAction = SocActionType.fromActionType(
                            decision.recommendedAction().toLowerCase().replace('_', '.'));
                    String actionType = socAction.map(SocActionType::actionType)
                            .orElse(decision.recommendedAction().toLowerCase().replace('_', '.'));

                    PlannedAction action = PlannedAction.of(
                            "Containment: " + decision.recommendedAction(),
                            actionType,
                            Map.of("riskScore", decision.riskScore(),
                                    "confidenceScore", decision.confidenceScore(),
                                    "severity", severity,
                                    "tactic", primaryTactic));
                    return WorkerResult.of(output, action);
                })
                .build();
    }
}
