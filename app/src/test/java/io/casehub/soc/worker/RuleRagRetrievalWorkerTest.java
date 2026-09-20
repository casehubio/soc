package io.casehub.soc.worker;

import io.casehub.soc.engine.rag.SocRagRetrieveService;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleRagRetrievalWorkerTest {

    @Test
    void workerMetadata() {
        var worker = RuleRagRetrievalWorker.create(stubService(List.of()));
        assertThat(worker.name()).isEqualTo("rule-rag-retrieval");
        assertThat(worker.capabilities()).containsExactly("rag-retrieval");
    }

    @Test
    void returnsRetrievedChunks() {
        var chunks = List.<Map<String, Object>>of(
            Map.of("content", "Credential dumping technique...",
                   "mitreId", "T1003", "relevanceScore", 0.87));
        var worker = RuleRagRetrievalWorker.create(stubService(chunks));

        var result = invokeWorker(worker, Map.of("alert", Map.of(
            "rule", "Credential Dumping", "description", "LSASS access")));

        @SuppressWarnings("unchecked")
        var output = (Map<String, Object>) result.output();
        @SuppressWarnings("unchecked")
        var retrieved = (List<?>) output.get("retrievedChunks");
        assertThat(retrieved).hasSize(1);
        assertThat((String) output.get("summary")).contains("1 relevant");
    }

    @Test
    void returnsEmptyWhenNoMatches() {
        var worker = RuleRagRetrievalWorker.create(stubService(List.of()));

        var result = invokeWorker(worker, Map.of("alert", Map.of(
            "rule", "Unknown Alert")));

        @SuppressWarnings("unchecked")
        var output = (Map<String, Object>) result.output();
        @SuppressWarnings("unchecked")
        var retrieved = (List<?>) output.get("retrievedChunks");
        assertThat(retrieved).isEmpty();
        assertThat(output.get("summary"))
            .isEqualTo("No relevant threat intelligence found");
    }

    private static SocRagRetrieveService stubService(List<Map<String, Object>> results) {
        return new SocRagRetrieveService() {
            @Override
            public List<Map<String, Object>> retrieve(Map<String, Object> ctx, String tid) {
                return results;
            }
        };
    }

    @SuppressWarnings("unchecked")
    private static WorkerResult<?> invokeWorker(Worker worker, Map<String, Object> input) {
        var sync = (io.casehub.worker.api.WorkerFunction.Sync<Map<String, Object>, ?>) worker.function();
        return sync.fn().apply(input, null);
    }
}
