package io.casehub.soc.engine;

import io.casehub.worker.api.Worker;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SocInvestigationCaseDescriptorTest {

    private final SocInvestigationCaseDescriptor descriptor =
            new SocInvestigationCaseDescriptor(new io.casehub.soc.worker.MockChatModel("{}"));

    @Test
    void produces6Workers() {
        assertThat(descriptor.workers()).hasSize(6);
    }

    @Test
    void workerNamesAreUnique() {
        var names = descriptor.workers().stream()
                .map(Worker::name)
                .toList();
        assertThat(names).doesNotHaveDuplicates();
    }

    @Test
    void threeCapabilitiesWithTwoWorkersEach() {
        var byCapability = descriptor.workers().stream()
                .collect(Collectors.groupingBy(
                        w -> w.capabilities().iterator().next()));
        assertThat(byCapability).hasSize(3);
        assertThat(byCapability.get("ioc-enrichment")).hasSize(2);
        assertThat(byCapability.get("attck-mapping")).hasSize(2);
        assertThat(byCapability.get("containment-recommendation")).hasSize(2);
    }

    @Test
    void ruleBasedWorkersListedFirst() {
        var workers = descriptor.workers();
        for (int i = 0; i < workers.size(); i += 2) {
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
                "rule-ioc-enrichment", "llm-ioc-enrichment",
                "rule-attck-mapping", "llm-attck-mapping",
                "rule-containment-rec", "llm-containment-rec");
    }
}
