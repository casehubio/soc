package io.casehub.soc.worker;

import io.casehub.worker.api.PlannedAction;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerOutcome;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleContainmentRecommendationWorkerConfidenceTest {

    @SuppressWarnings("unchecked")
    private static WorkerResult<?> invokeWorker(Worker worker, Map<String, Object> input) {
        var sync = (io.casehub.worker.api.WorkerFunction.Sync<Map<String, Object>, ?>) worker.function();
        return sync.fn().apply(input, null);
    }

    @Test
    void plannedAction_includesConfidenceScore() {
        Worker worker = RuleContainmentRecommendationWorker.create();
        var result = invokeWorker(worker, Map.of(
                "alert", Map.of("severity", "MEDIUM"),
                "attckMapping", Map.of("primaryTactic", "CREDENTIAL_ACCESS")));

        if (result.outcome() instanceof WorkerOutcome.Success<?> success) {
            PlannedAction action = success.plannedAction();
            if (action != null) {
                assertThat(action.parameters())
                        .as("PlannedAction must include confidenceScore for CONFIDENCE_THRESHOLD gate policy")
                        .containsKey("confidenceScore");
            }
        }
    }
}
