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
        return new SocCbrRetrieveService(new io.casehub.neocortex.memory.cbr.CbrCaseMemoryStore() {
            @Override
            public void registerSchema(io.casehub.neocortex.memory.cbr.CbrFeatureSchema s)                                                                                                                      {}

            @Override
            public String store(io.casehub.neocortex.memory.cbr.CbrCase c, String t, String e, io.casehub.neocortex.memory.MemoryDomain d, String tid, String cid, io.casehub.platform.api.path.Path s2)        {return cid;}

            @Override
            public <C extends io.casehub.neocortex.memory.cbr.CbrCase> java.util.List<io.casehub.neocortex.memory.cbr.ScoredCbrCase<C>> retrieveSimilar(io.casehub.neocortex.memory.cbr.CbrQuery q, Class<C> t) {return java.util.List.of();}

            @Override
            public Integer erase(io.casehub.neocortex.memory.EraseRequest r)                                                                                                                                    {return 0;}

            @Override
            public Integer eraseEntity(String e, String t)                                                                                                                                                      {return 0;}

            @Override
            public Integer eraseByScope(io.casehub.platform.api.path.Path s, String t)                                                                                                                          {return 0;}

            @Override
            public void recordOutcome(String c, String t, io.casehub.neocortex.memory.cbr.CbrOutcome o)                                                                                                         {}

            @Override
            public Integer purge(io.casehub.neocortex.memory.cbr.CbrRetentionPolicy p)                                                                                                                          {return 0;}

            @Override
            public void supersede(String c, String t, String s, String r)                                                                                                                                       {}

            @Override
            public void reinstate(String c, String t)                                                                                                                                                           {}

            @Override
            public io.casehub.neocortex.memory.cbr.SupersessionStatus getSupersessionStatus(String c, String t)                                                                                                 {return null;}

            @Override
            public java.util.List<io.casehub.neocortex.memory.cbr.SupersessionStatus> findSupersededCases(String t, io.casehub.neocortex.memory.MemoryDomain d)                                                 {return java.util.List.of();}
        }) {
            @Override
            public List<Map<String, Object>> retrieve(Map<String, Object> ctx, String tid) {
                return results;
            }
        };
    }
}
