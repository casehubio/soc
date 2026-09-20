package io.casehub.soc.worker;

import io.casehub.soc.engine.cbr.SocCbrRetrieveService;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleCbrRetrievalWorkerTest {

    @Test
    void workerMetadata() {
        var worker = RuleCbrRetrievalWorker.create(stubService(List.of()));
        assertThat(worker.name()).isEqualTo("rule-cbr-retrieval");
        assertThat(worker.capabilities()).containsExactly("cbr-retrieval");
    }

    @Test
    void returnsRetrievedIncidents() {
        var similar = List.<Map<String, Object>>of(
            Map.of("alertType", "malware", "similarityScore", 0.85));
        var worker = RuleCbrRetrievalWorker.create(stubService(similar));

        var result = invokeWorker(worker, Map.of("alert", Map.of(
            "type", "malware", "source", "siem-1",
            "severity", "HIGH", "description", "Ransomware")));

        @SuppressWarnings("unchecked")
        var output = (Map<String, Object>) result.output();
        @SuppressWarnings("unchecked")
        var incidents = (List<?>) output.get("retrievedIncidents");
        assertThat(incidents).hasSize(1);
        assertThat((String) output.get("summary")).contains("1 similar");
    }

    @Test
    void returnsEmptyWhenNoMatches() {
        var worker = RuleCbrRetrievalWorker.create(stubService(List.of()));

        var result = invokeWorker(worker, Map.of("alert", Map.of(
            "type", "novel", "source", "new",
            "severity", "LOW", "description", "Unknown")));

        @SuppressWarnings("unchecked")
        var output = (Map<String, Object>) result.output();
        @SuppressWarnings("unchecked")
        var incidents = (List<?>) output.get("retrievedIncidents");
        assertThat(incidents).isEmpty();
        assertThat(output.get("summary")).isEqualTo("No similar past incidents found");
    }

    @SuppressWarnings("unchecked")
    private static WorkerResult<?> invokeWorker(Worker worker, Map<String, Object> input) {
        var sync = (io.casehub.worker.api.WorkerFunction.Sync<Map<String, Object>, ?>) worker.function();
        return sync.fn().apply(input, null);
    }

    private static SocCbrRetrieveService stubService(List<Map<String, Object>> results) {
        return new SocCbrRetrieveService(new io.casehub.soc.engine.cbr.StubCbrCaseMemoryStore()) {
            @Override
            public List<Map<String, Object>> retrieve(Map<String, Object> ctx, String tid) {
                return results;
            }
        };
    }
}
