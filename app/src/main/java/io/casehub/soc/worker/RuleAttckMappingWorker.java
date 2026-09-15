package io.casehub.soc.worker;

import io.casehub.soc.threatintel.attck.AttckEnrichmentService;
import io.casehub.soc.threatintel.attck.AttckLookupTable;
import io.casehub.soc.threatintel.attck.AttckRelatedEntity;
import io.casehub.soc.worker.contract.AttckMappingOutput;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class RuleAttckMappingWorker {

    private RuleAttckMappingWorker() {}

    public static Worker create(AttckEnrichmentService enrichmentService) {
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
                    var enriched = mapping.techniques().stream()
                            .map(t -> enrichTechnique(t, enrichmentService))
                            .collect(Collectors.toList());
                    return WorkerResult.of(Map.of(
                            "techniques", enriched,
                            "primaryTactic", mapping.primaryTactic(),
                            "confidence", mapping.confidence(),
                            "narrative", mapping.narrative()));
                })
                .build();
    }

    private static Map<String, Object> enrichTechnique(
            AttckMappingOutput.TechniqueEntry entry,
            AttckEnrichmentService enrichmentService) {
        var groups = enrichmentService.getRelatedGroups(entry.technique()).stream()
                .map(AttckRelatedEntity::name).toList();
        var mitigations = enrichmentService.getMitigations(entry.technique()).stream()
                .map(e -> e.mitreId() + " — " + e.name()).toList();
        var subTechniques = enrichmentService.getSubTechniques(entry.technique()).stream()
                .map(e -> e.mitreId() + " — " + e.name()).toList();
        return Map.of(
                "technique", entry.technique(),
                "confidence", entry.confidence(),
                "evidence", entry.evidence(),
                "relatedGroups", groups,
                "mitigations", mitigations,
                "subTechniques", subTechniques);
    }
}
