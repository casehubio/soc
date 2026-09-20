package io.casehub.soc.engine;

import io.casehub.worker.api.Worker;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SocInvestigationCaseDescriptorTest {

    private final SocInvestigationCaseDescriptor descriptor =
            new SocInvestigationCaseDescriptor(new io.casehub.soc.worker.MockChatModel("{}"), stubRetrieveService(), null, null, null);

    private static io.casehub.soc.engine.cbr.SocCbrRetrieveService stubRetrieveService() {
        return new io.casehub.soc.engine.cbr.SocCbrRetrieveService(
                new io.casehub.soc.engine.cbr.StubCbrCaseMemoryStore());
    }

    @Test
    void produces11Workers() {
        assertThat(descriptor.workers()).hasSize(11);
    }

    @Test
    void workerNamesAreUnique() {
        var names = descriptor.workers().stream()
                .map(Worker::name)
                .toList();
        assertThat(names).doesNotHaveDuplicates();
    }

    @Test
    void eightCapabilities() {
        var byCapability = descriptor.workers().stream()
                                     .collect(Collectors.groupingBy(
                                             w -> w.capabilities().iterator().next()));
        assertThat(byCapability).hasSize(8);
        assertThat(byCapability.get("cbr-retrieval")).hasSize(1);
        assertThat(byCapability.get("ioc-enrichment")).hasSize(2);
        assertThat(byCapability.get("attck-mapping")).hasSize(2);
        assertThat(byCapability.get("rag-retrieval")).hasSize(1);
        assertThat(byCapability.get("containment-recommendation")).hasSize(2);
        assertThat(byCapability.get("containment-execution")).hasSize(1);
        assertThat(byCapability.get("recovery-verification-start")).hasSize(1);
        assertThat(byCapability.get("recovery-verification-result")).hasSize(1);
    }

    @Test
    void cbrWorkerFirstThenRuleLlmPairsThenRagThenExecution() {
        var workers = descriptor.workers();
        assertThat(workers.get(0).name()).isEqualTo("rule-cbr-retrieval");
        for (int i = 1; i <= 4; i += 2) {
            assertThat(workers.get(i).name()).startsWith("rule-");
            assertThat(workers.get(i + 1).name()).startsWith("llm-");
        }
        assertThat(workers.get(5).name()).isEqualTo("rule-rag-retrieval");
        for (int i = 6; i <= 7; i += 2) {
            assertThat(workers.get(i).name()).startsWith("rule-");
            assertThat(workers.get(i + 1).name()).startsWith("llm-");
        }
        assertThat(workers.get(8).name()).isEqualTo("rule-containment-exec");
    }

    @Test
    void expectedWorkerNames() {
        Set<String> names = descriptor.workers().stream()
                                      .map(Worker::name)
                                      .collect(Collectors.toSet());
        assertThat(names).containsExactlyInAnyOrder(
                "rule-cbr-retrieval",
                "rule-ioc-enrichment", "llm-ioc-enrichment",
                "rule-attck-mapping", "llm-attck-mapping",
                "rule-rag-retrieval",
                "rule-containment-rec", "llm-containment-rec",
                "rule-containment-exec",
                "rule-recovery-verification-start",
                "rule-recovery-verification-result");
    }
}
