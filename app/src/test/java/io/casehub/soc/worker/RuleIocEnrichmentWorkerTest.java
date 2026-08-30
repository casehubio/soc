package io.casehub.soc.worker;

import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerFunction;
import io.casehub.worker.api.WorkerResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuleIocEnrichmentWorkerTest {

    private final Worker worker = RuleIocEnrichmentWorker.create();

    @Test
    void workerMetadata() {
        assertThat(worker.name()).isEqualTo("rule-ioc-enrichment");
        assertThat(worker.capabilities()).containsExactly("ioc-enrichment");
    }

    @Test
    @SuppressWarnings("unchecked")
    void extractsIocsFromAlertRawData() {
        var input = Map.<String, Object>of("alert", Map.of(
                "eventType", "soc.alert.siem.crowdstrike",
                "severity", "CRITICAL",
                "source", "crowdstrike",
                "rule", "credential-harvesting",
                "rawData", Map.of("sourceIp", "192.168.1.100", "fileHash", "d41d8cd98f00b204e9800998ecf8427e")));

        WorkerResult<Map<String, Object>> result = invokeWorker(input);

        assertThat(result.output()).containsKey("iocs");
        assertThat(result.output()).containsKey("summary");
        var iocs = (List<Map<String, Object>>) result.output().get("iocs");
        assertThat(iocs).isNotEmpty();
        assertThat(result.output().get("summary")).asString().contains("IOC");
    }

    @Test
    void emptyRawData_returnsEmptyIocList() {
        var input = Map.<String, Object>of("alert", Map.of(
                "eventType", "soc.alert.siem.crowdstrike",
                "severity", "MEDIUM",
                "source", "crowdstrike",
                "rule", "generic",
                "rawData", Map.of()));

        WorkerResult<Map<String, Object>> result = invokeWorker(input);

        @SuppressWarnings("unchecked")
        var iocs = (List<Map<String, Object>>) result.output().get("iocs");
        assertThat(iocs).isEmpty();
        assertThat(result.output().get("summary")).isEqualTo("No IOCs identified");
    }

    @Test
    void missingAlert_returnsEmptyIocList() {
        var input = Map.<String, Object>of();

        WorkerResult<Map<String, Object>> result = invokeWorker(input);

        @SuppressWarnings("unchecked")
        var iocs = (List<Map<String, Object>>) result.output().get("iocs");
        assertThat(iocs).isEmpty();
    }

    @SuppressWarnings("unchecked")
    private WorkerResult<Map<String, Object>> invokeWorker(Map<String, Object> input) {
        return ((WorkerFunction.Sync<Map<String, Object>, Map<String, Object>>) worker.function())
                .fn().apply(input, null);
    }
}
