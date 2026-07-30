package io.casehub.soc.worker;

import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerFunction;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleAttckMappingWorkerTest {

    private final Worker worker = RuleAttckMappingWorker.create();

    @Test
    void workerMetadata() {
        assertThat(worker.name()).isEqualTo("rule-attck-mapping");
        assertThat(worker.capabilityNames()).containsExactly("attck-mapping");
    }

    @Test
    @SuppressWarnings("unchecked")
    void mapsCredentialHarvestingWithEmailIoc() {
        var input = Map.<String, Object>of(
                "alert", Map.of("rule", "credential-harvesting-detected"),
                "iocEnrichment", Map.of(
                        "iocs", List.of(Map.of("type", "EMAIL", "value", "phish@evil.com", "source", "sender")),
                        "summary", "1 IOC"));

        var result = invokeWorker(input);

        assertThat(result.output().get("primaryTactic")).isEqualTo("INITIAL_ACCESS");
        var techniques = (List<Map<String, Object>>) result.output().get("techniques");
        assertThat(techniques).isNotEmpty();
        assertThat(techniques.getFirst().get("technique")).isEqualTo("T1566");
    }

    @Test
    void noIocs_stillProducesMapping() {
        var input = Map.<String, Object>of(
                "alert", Map.of("rule", "unknown-rule"),
                "iocEnrichment", Map.of("iocs", List.of(), "summary", "No IOCs"));

        var result = invokeWorker(input);

        assertThat(result.output()).containsKeys("techniques", "primaryTactic", "confidence", "narrative");
    }

    @SuppressWarnings("unchecked")
    private WorkerResult<Map<String, Object>> invokeWorker(Map<String, Object> input) {
        return ((WorkerFunction.Sync<Map<String, Object>, Map<String, Object>>) worker.function())
                .fn().apply(input, null);
    }
}
