package io.casehub.soc.worker;

import io.casehub.soc.engine.rag.SocRagRetrieveService;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.List;
import java.util.Map;

public final class RuleRagRetrievalWorker {

    static final String DEFAULT_TENANT = "278776f9-e1b0-46fb-9032-8bddebdcf9ce";

    private RuleRagRetrievalWorker() {}

    public static Worker create(SocRagRetrieveService retrieveService) {
        return Worker.builder()
                .name("rule-rag-retrieval")
                .capabilityName("rag-retrieval")
                .function((Map<String, Object> input) -> {
                    List<Map<String, Object>> results =
                        retrieveService.retrieve(input, DEFAULT_TENANT);
                    String summary = results.isEmpty()
                        ? "No relevant threat intelligence found"
                        : results.size() + " relevant chunk(s) retrieved";
                    return WorkerResult.of(Map.of(
                        "retrievedChunks", results,
                        "summary", summary));
                })
                .build();
    }
}
