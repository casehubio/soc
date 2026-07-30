package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.AttckMappingOutput;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class RuleAttckMappingWorker {

    private RuleAttckMappingWorker() {}

    public static Worker create() {
        return Worker.builder()
                .name("rule-attck-mapping")
                .capabilityName("attck-mapping")
                .function((Map<String, Object> input) -> {
                    @SuppressWarnings("unchecked")
                    var alert = (Map<String, Object>) input.getOrDefault("alert", Map.of());
                    String alertRule = (String) alert.getOrDefault("rule", "");

                    @SuppressWarnings("unchecked")
                    var enrichment = (Map<String, Object>) input.getOrDefault("iocEnrichment", Map.of());
                    @SuppressWarnings("unchecked")
                    var iocs = (List<Map<String, Object>>) enrichment.getOrDefault("iocs", List.of());
                    var iocTypes = iocs.stream()
                            .map(m -> (String) m.get("type"))
                            .collect(Collectors.toList());

                    AttckMappingOutput mapping = AttckLookupTable.lookup(alertRule, iocTypes);
                    var techniqueMaps = mapping.techniques().stream()
                            .map(t -> Map.<String, Object>of(
                                    "technique", t.technique(),
                                    "confidence", t.confidence(),
                                    "evidence", t.evidence()))
                            .collect(Collectors.toList());
                    return WorkerResult.of(Map.of(
                            "techniques", techniqueMaps,
                            "primaryTactic", mapping.primaryTactic(),
                            "confidence", mapping.confidence(),
                            "narrative", mapping.narrative()));
                })
                .build();
    }
}
