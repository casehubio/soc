package io.casehub.soc.engine;

import io.casehub.worker.api.Worker;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SocInvestigationCaseDescriptorTest {

    private final SocInvestigationCaseDescriptor descriptor =
            new SocInvestigationCaseDescriptor(new io.casehub.soc.worker.MockChatModel("{}"), stubRetrieveService());

    private static io.casehub.soc.engine.cbr.SocCbrRetrieveService stubRetrieveService() {
        return new io.casehub.soc.engine.cbr.SocCbrRetrieveService(
                new io.casehub.soc.engine.cbr.StubCbrCaseMemoryStore());
    }

    @Test
    void produces7Workers() {
        assertThat(descriptor.workers()).hasSize(7);
    }

    @Test
    void workerNamesAreUnique() {
        var names = descriptor.workers().stream()
                .map(Worker::name)
                .toList();
        assertThat(names).doesNotHaveDuplicates();
    }

    @Test
    void fourCapabilities() {
        var byCapability = descriptor.workers().stream()
                                     .collect(Collectors.groupingBy(
                                             w -> w.capabilities().iterator().next()));
        assertThat(byCapability).hasSize(4);
        assertThat(byCapability.get("cbr-retrieval")).hasSize(1);
        assertThat(byCapability.get("ioc-enrichment")).hasSize(2);
        assertThat(byCapability.get("attck-mapping")).hasSize(2);
        assertThat(byCapability.get("containment-recommendation")).hasSize(2);
    }

    @Test
    void cbrWorkerFirstThenRuleLlmPairs() {
        var workers = descriptor.workers();
        assertThat(workers.get(0).name()).isEqualTo("rule-cbr-retrieval");
        for (int i = 1; i < workers.size(); i += 2) {
            assertThat(workers.get(i).name()).startsWith("rule-");
            assertThat(workers.get(i + 1).name()).startsWith("llm-");
        }
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
                "rule-containment-rec", "llm-containment-rec");
    }
}
