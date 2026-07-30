package io.casehub.soc.worker;

import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerFunction;
import io.casehub.worker.api.WorkerOutcome;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleContainmentRecWorkerTest {

    private final Worker worker = RuleContainmentRecommendationWorker.create();

    @Test
    void workerMetadata() {
        assertThat(worker.name()).isEqualTo("rule-containment-rec");
        assertThat(worker.capabilityNames()).containsExactly("containment-recommendation");
    }

    @Test
    void criticalCredentialAccess_producesPlannedAction() {
        var input = Map.<String, Object>of(
                "alert", Map.of("severity", "CRITICAL"),
                "iocEnrichment", Map.of("iocs", List.of()),
                "attckMapping", Map.of("primaryTactic", "CREDENTIAL_ACCESS", "confidence", 0.85));

        var result = invokeWorker(input);

        assertThat(result.output().get("recommendedAction")).isEqualTo("REVOKE_CREDENTIALS");
        assertThat(result.outcome()).isInstanceOf(WorkerOutcome.Success.class);
        var success = (WorkerOutcome.Success<?>) result.outcome();
        assertThat(success.plannedAction()).isNotNull();
        assertThat(success.plannedAction().actionType()).isEqualTo("revoke.credentials");
    }

    @Test
    void lowSeverity_noPlannedAction() {
        var input = Map.<String, Object>of(
                "alert", Map.of("severity", "LOW"),
                "iocEnrichment", Map.of("iocs", List.of()),
                "attckMapping", Map.of("primaryTactic", "INITIAL_ACCESS", "confidence", 0.50));

        var result = invokeWorker(input);

        assertThat(result.output().get("recommendedAction")).isNull();
        assertThat(result.outcome()).isInstanceOf(WorkerOutcome.Success.class);
        var success = (WorkerOutcome.Success<?>) result.outcome();
        assertThat(success.plannedAction()).isNull();
    }

    @Test
    void highExecution_producesIsolateHost() {
        var input = Map.<String, Object>of(
                "alert", Map.of("severity", "HIGH"),
                "iocEnrichment", Map.of("iocs", List.of()),
                "attckMapping", Map.of("primaryTactic", "EXECUTION", "confidence", 0.75));

        var result = invokeWorker(input);

        assertThat(result.output().get("recommendedAction")).isEqualTo("ISOLATE_HOST");
        var success = (WorkerOutcome.Success<?>) result.outcome();
        assertThat(success.plannedAction()).isNotNull();
        assertThat(success.plannedAction().actionType()).isEqualTo("isolate.host");
    }

    @SuppressWarnings("unchecked")
    private WorkerResult<Map<String, Object>> invokeWorker(Map<String, Object> input) {
        return ((WorkerFunction.Sync<Map<String, Object>, Map<String, Object>>) worker.function())
                .fn().apply(input, null);
    }
}
