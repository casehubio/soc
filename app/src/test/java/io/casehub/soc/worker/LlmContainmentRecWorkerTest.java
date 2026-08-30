package io.casehub.soc.worker;

import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerFunction;
import io.casehub.worker.api.WorkerOutcome;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LlmContainmentRecWorkerTest {

    private final MockChatModel mockModel =
            MockChatModel.fromFixture("fixtures/llm/containment-rec-response.json");
    private final Worker worker = LlmContainmentRecommendationWorker.create(mockModel);

    @Test
    void workerMetadata() {
        assertThat(worker.name()).isEqualTo("llm-containment-rec");
        assertThat(worker.capabilities()).containsExactly("containment-recommendation");
        assertThat(worker.function()).isInstanceOf(WorkerFunction.Sync.class);
    }

    @Test
    void producesPlannedAction() {
        var input = Map.<String, Object>of(
                "alert", Map.of("severity", "CRITICAL", "rule", "credential-harvesting"),
                "iocEnrichment", Map.of("iocs", List.of(), "summary", "1 IOC"),
                "attckMapping", Map.of("primaryTactic", "CREDENTIAL_ACCESS", "confidence", 0.85));

        var result = invokeWorker(input);

        assertThat(result.output().get("recommendedAction")).isEqualTo("REVOKE_CREDENTIALS");
        assertThat(result.outcome()).isInstanceOf(WorkerOutcome.Success.class);
        var success = (WorkerOutcome.Success<?>) result.outcome();
        assertThat(success.plannedAction()).isNotNull();
        assertThat(success.plannedAction().actionType()).isEqualTo("revoke.credentials");
    }

    @Test
    void noRecommendedAction_noPlannedAction() {
        var noActionModel = new MockChatModel("""
                {"recommendedAction": null, "riskScore": 0.1, "confidenceScore": 0.9,
                 "rationale": "No containment needed", "actionParameters": {}}
                """);
        var noActionWorker = LlmContainmentRecommendationWorker.create(noActionModel);

        var input = Map.<String, Object>of(
                "alert", Map.of("severity", "LOW"),
                "iocEnrichment", Map.of("iocs", List.of(), "summary", "none"),
                "attckMapping", Map.of("primaryTactic", "INITIAL_ACCESS", "confidence", 0.30));

        @SuppressWarnings("unchecked")
        var fn = (WorkerFunction.Sync<Map<String, Object>, Map<String, Object>>) noActionWorker.function();
        var result = fn.fn().apply(input, null);

        assertThat(result.outcome()).isInstanceOf(WorkerOutcome.Success.class);
        var success = (WorkerOutcome.Success<?>) result.outcome();
        assertThat(success.plannedAction()).isNull();
    }

    @SuppressWarnings("unchecked")
    private WorkerResult<Map<String, Object>> invokeWorker(Map<String, Object> input) {
        var fn = (WorkerFunction.Sync<Map<String, Object>, Map<String, Object>>) worker.function();
        return fn.fn().apply(input, null);
    }
}
