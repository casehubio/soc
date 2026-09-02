package io.casehub.soc.worker;

import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleContainmentExecutionWorkerTest {

    private final ContainmentExecutor loggingExecutor = (actionType, params, ctx) ->
            ContainmentResult.success("Logged: " + actionType, Instant.now());

    @SuppressWarnings("unchecked")
    private static WorkerResult<?> invokeWorker(Worker worker, Map<String, Object> input) {
        var sync = (io.casehub.worker.api.WorkerFunction.Sync<Map<String, Object>, ?>) worker.function();
        return sync.fn().apply(input, null);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> outputMap(WorkerResult<?> result) {
        return (Map<String, Object>) result.output();
    }

    @Test
    void executesWhenActionGateApproved() {
        Worker worker = RuleContainmentExecutionWorker.create(loggingExecutor);
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("actionGateApproved", Map.of(
                "actionType", "isolate.host",
                "approvedBy", "analyst-jane",
                "resolution", "confirmed threat"));
        input.put("containmentRecommendation", Map.of(
                "recommendedAction", "ISOLATE_HOST",
                "riskScore", 0.95,
                "actionParameters", Map.of("hostId", "srv-42")));
        input.put("alert", Map.of("detectedAt", "2026-09-02T10:00:00Z"));

        var output = outputMap(invokeWorker(worker, input));
        assertThat(output).containsEntry("executed", true);
        assertThat(output).containsEntry("success", true);
        assertThat(output).containsEntry("actionType", "isolate.host");
    }

    @Test
    void executesWhenAutonomous_noGateSignal() {
        Worker worker = RuleContainmentExecutionWorker.create(loggingExecutor);
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("containmentRecommendation", Map.of(
                "recommendedAction", "BLOCK_IP",
                "riskScore", 0.3,
                "actionParameters", Map.of("ip", "10.0.1.99")));
        input.put("alert", Map.of("detectedAt", "2026-09-02T10:00:00Z"));

        var output = outputMap(invokeWorker(worker, input));
        assertThat(output).containsEntry("executed", true);
    }

    @Test
    void skipsWhenActionGateRejected() {
        Worker worker = RuleContainmentExecutionWorker.create(loggingExecutor);
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("actionGateRejected", Map.of(
                "actionType", "isolate.host",
                "rejectedBy", "analyst-bob",
                "reason", "false positive"));
        input.put("containmentRecommendation", Map.of(
                "recommendedAction", "ISOLATE_HOST"));

        var output = outputMap(invokeWorker(worker, input));
        assertThat(output).containsEntry("executed", false);
    }

    @Test
    void skipsWhenNoContainmentRecommended() {
        Worker worker = RuleContainmentExecutionWorker.create(loggingExecutor);
        Map<String, Object> input = new LinkedHashMap<>();
        var rec = new LinkedHashMap<String, Object>();
        rec.put("recommendedAction", null);
        input.put("containmentRecommendation", rec);

        var output = outputMap(invokeWorker(worker, input));
        assertThat(output).containsEntry("executed", false);
    }
}
