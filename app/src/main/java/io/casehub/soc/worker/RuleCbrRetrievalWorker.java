package io.casehub.soc.worker;

import io.casehub.soc.engine.cbr.SocCbrRetrieveService;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.List;
import java.util.Map;

public final class RuleCbrRetrievalWorker {

    static final String DEFAULT_TENANT = "278776f9-e1b0-46fb-9032-8bddebdcf9ce";

    private RuleCbrRetrievalWorker() {}

    public static Worker create(SocCbrRetrieveService retrieveService) {
        return Worker.builder()
                .name("rule-cbr-retrieval")
                .capabilityName("cbr-retrieval")
                .function((Map<String, Object> input) -> {
                    List<Map<String, Object>> results =
                        retrieveService.retrieve(input, DEFAULT_TENANT);
                    String summary = results.isEmpty()
                        ? "No similar past incidents found"
                        : results.size() + " similar incident(s) retrieved";
                    return WorkerResult.of(Map.of(
                        "retrievedIncidents", results,
                        "summary", summary));
                })
                .build();
    }
}
