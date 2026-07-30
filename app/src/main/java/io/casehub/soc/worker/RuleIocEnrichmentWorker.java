package io.casehub.soc.worker;

import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class RuleIocEnrichmentWorker {

    private RuleIocEnrichmentWorker() {}

    public static Worker create() {
        return Worker.builder()
                .name("rule-ioc-enrichment")
                .capabilityName("ioc-enrichment")
                .function((Map<String, Object> input) -> {
                    @SuppressWarnings("unchecked")
                    var alert = (Map<String, Object>) input.get("alert");
                    if (alert == null) {
                        return WorkerResult.of(Map.of("iocs", List.of(), "summary", "No alert data"));
                    }
                    @SuppressWarnings("unchecked")
                    var rawData = (Map<String, Object>) alert.get("rawData");
                    var iocEntries = IocExtractor.extract(rawData);
                    var iocMaps = iocEntries.stream()
                            .map(e -> Map.<String, Object>of("type", e.type(), "value", e.value(), "source", e.source()))
                            .collect(Collectors.toList());
                    String summary = iocEntries.isEmpty()
                            ? "No IOCs identified"
                            : iocEntries.size() + " IOC" + (iocEntries.size() > 1 ? "s" : "") + " extracted";
                    return WorkerResult.of(Map.of("iocs", iocMaps, "summary", summary));
                })
                .build();
    }
}
