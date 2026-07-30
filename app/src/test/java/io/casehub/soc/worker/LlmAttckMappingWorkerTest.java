package io.casehub.soc.worker;

import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.worker.api.Worker;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LlmAttckMappingWorkerTest {

    private final MockChatModel mockModel =
            MockChatModel.fromFixture("fixtures/llm/attck-mapping-response.json");
    private final Worker worker = LlmAttckMappingWorker.create(mockModel);

    @Test
    void workerMetadata() {
        assertThat(worker.name()).isEqualTo("llm-attck-mapping");
        assertThat(worker.capabilityNames()).containsExactly("attck-mapping");
        assertThat(worker.function()).isInstanceOf(AgentWorkerFunction.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void producesAttckMappingFromLlmResponse() {
        var input = Map.<String, Object>of(
                "alert", Map.of("rule", "credential-harvesting"),
                "iocEnrichment", Map.of(
                        "iocs", List.of(Map.of("type", "EMAIL", "value", "phish@evil.com", "source", "sender")),
                        "summary", "1 IOC"));

        var agentFn = (AgentWorkerFunction) worker.function();
        var result = agentFn.agent().execute(input);

        assertThat(result.output()).containsKeys("techniques", "primaryTactic", "confidence", "narrative");
        var techniques = (List<Map<String, Object>>) result.output().get("techniques");
        assertThat(techniques).isNotEmpty();
    }
}
