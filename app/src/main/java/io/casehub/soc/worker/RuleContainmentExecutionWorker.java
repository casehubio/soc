package io.casehub.soc.worker;

import io.casehub.soc.engine.spi.ContainmentContext;
import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

public final class RuleContainmentExecutionWorker {

    private RuleContainmentExecutionWorker() {}

    public static Worker create(ContainmentExecutor executor) {
        return Worker.builder()
                .name("rule-containment-exec")
                .capabilityName("containment-execution")
                .function((Map<String, Object> input) -> {
                    @SuppressWarnings("unchecked")
                    var recommendation = (Map<String, Object>) input.getOrDefault(
                            "containmentRecommendation", Map.of());
                    Object recommendedAction = recommendation.get("recommendedAction");

                    if (recommendedAction == null) {
                        return skipResult("No containment action recommended");
                    }

                    @SuppressWarnings("unchecked")
                    var rejected = (Map<String, Object>) input.get("actionGateRejected");
                    if (rejected != null) {
                        return skipResult("Containment rejected: " +
                                rejected.getOrDefault("reason", "no reason given"));
                    }

                    String actionType = recommendedAction.toString().toLowerCase().replace('_', '.');

                    @SuppressWarnings("unchecked")
                    var approved = (Map<String, Object>) input.get("actionGateApproved");
                    String approver = approved != null
                            ? (String) approved.getOrDefault("approvedBy", null)
                            : null;

                    @SuppressWarnings("unchecked")
                    var actionParams = (Map<String, Object>) recommendation.getOrDefault(
                            "actionParameters", Map.of());

                    var context = new ContainmentContext(
                            UUID.randomUUID(), actionType, approver, "default");

                    ContainmentResult result = executor.execute(actionType, actionParams, context);

                    long detectionToContainmentMs = 0;
                    @SuppressWarnings("unchecked")
                    var alert = (Map<String, Object>) input.get("alert");
                    if (alert != null && alert.get("detectedAt") != null) {
                        try {
                            Instant detected = Instant.parse(alert.get("detectedAt").toString());
                            detectionToContainmentMs = Duration.between(detected, result.timestamp()).toMillis();
                        } catch (Exception ignored) {}
                    }

                    var output = new LinkedHashMap<String, Object>();
                    output.put("actionType", actionType);
                    output.put("executed", true);
                    output.put("success", result.success());
                    output.put("details", result.details());
                    output.put("errorReason", result.errorReason());
                    output.put("executionTimestamp", result.timestamp().toString());
                    output.put("detectionToContainmentMs", detectionToContainmentMs);

                    return WorkerResult.of(output);
                })
                .build();
    }

    private static WorkerResult skipResult(String reason) {
        var output = new LinkedHashMap<String, Object>();
        output.put("actionType", (Object) null);
        output.put("executed", false);
        output.put("success", false);
        output.put("details", reason);
        output.put("errorReason", (Object) null);
        output.put("executionTimestamp", (Object) null);
        output.put("detectionToContainmentMs", 0L);
        return WorkerResult.of(output);
    }
}
