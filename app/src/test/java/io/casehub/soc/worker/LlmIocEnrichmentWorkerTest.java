package io.casehub.soc.worker;

import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.worker.api.Worker;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LlmIocEnrichmentWorkerTest {

    private final MockChatModel mockModel =
            MockChatModel.fromFixture("fixtures/llm/ioc-enrichment-response.json");
    private final Worker worker = LlmIocEnrichmentWorker.create(mockModel);

    @Test
    void workerMetadata() {
        assertThat(worker.name()).isEqualTo("llm-ioc-enrichment");
        assertThat(worker.capabilities()).containsExactly("ioc-enrichment");
        assertThat(worker.function()).isInstanceOf(AgentWorkerFunction.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void producesIocEnrichmentFromLlmResponse() {
        var input = Map.<String, Object>of("alert", Map.of(
                "eventType", "soc.alert.siem.crowdstrike",
                "severity", "CRITICAL",
                "source", "crowdstrike",
                "rule", "credential-harvesting",
                "rawData", Map.of("sourceIp", "203.0.113.50")));

        var agentFn = (AgentWorkerFunction) worker.function();
        var result = agentFn.agent().execute(input);

        assertThat(result.output()).containsKey("iocs");
        var iocs = (List<Map<String, Object>>) result.output().get("iocs");
        assertThat(iocs).hasSizeGreaterThanOrEqualTo(1);
        assertThat(result.output().get("summary")).asString().isNotBlank();
    }
}
