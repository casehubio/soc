package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.neocortex.cognitive.Confidence;
import io.casehub.neocortex.memory.cbr.CbrCase;
import io.casehub.neocortex.memory.cbr.FeatureValue;

import java.util.*;

public record SocIncidentCbrCase(
        String problem,
        String solution,
        String outcome,
        Confidence confidence,
        Map<String, FeatureValue> features,
        Double trustScore,
        String producerAgentId,
        String alertType,
        String sourceSystem,
        List<String> attckTechniqueIds,
        List<String> iocTypes,
        String severityOutcome,
        String containmentOutcome,
        String playbook,
        long investigationDurationMinutes
) implements CbrCase {

    public static final String CBR_TYPE = "soc-incident";

    @Override
    public String cbrType() { return CBR_TYPE; }

    @Override
    public CbrCase withOutcome(String outcome, Confidence confidence) {
        return new SocIncidentCbrCase(problem, solution, outcome, confidence,
            features, trustScore, producerAgentId, alertType, sourceSystem,
            attckTechniqueIds, iocTypes, severityOutcome, containmentOutcome,
            playbook, investigationDurationMinutes);
    }

    @Override
    public CbrCase withFeatures(Map<String, FeatureValue> features) {
        return new SocIncidentCbrCase(problem, solution, outcome, confidence,
            features, trustScore, producerAgentId, alertType, sourceSystem,
            attckTechniqueIds, iocTypes, severityOutcome, containmentOutcome,
            playbook, investigationDurationMinutes);
    }

    @SuppressWarnings("unchecked")
    public static SocIncidentCbrCase fromSnapshot(Map<String, Object> snapshot,
                                                   CaseOutcomeEvent event) {
        var alert = (Map<String, Object>) snapshot.getOrDefault("alert", Map.of());
        var attckMapping = (Map<String, Object>) snapshot.getOrDefault("attckMapping", Map.of());
        var iocEnrichment = (Map<String, Object>) snapshot.getOrDefault("iocEnrichment", Map.of());
        var containmentRec = (Map<String, Object>) snapshot.getOrDefault(
            "containmentRecommendation", Map.of());

        String alertType = (String) alert.get("type");
        String sourceSystem = (String) alert.get("source");
        String description = (String) alert.get("description");
        String analystOutcome = (String) snapshot.get("analystOutcome");
        String playbook = (String) containmentRec.get("playbook");
        String containmentSummary = (String) containmentRec.get("summary");

        var techniques = (List<Map<String, Object>>) attckMapping.getOrDefault("techniques", List.of());
        List<String> techniqueIds = techniques.stream()
            .map(t -> (String) t.get("id"))
            .filter(Objects::nonNull)
            .toList();

        var iocTypesList = (List<String>) iocEnrichment.getOrDefault("iocTypes", List.of());

        String problem = (alertType != null ? alertType : "unknown") + " from "
            + (sourceSystem != null ? sourceSystem : "unknown")
            + (description != null ? ": " + description : "");
        String solution = (analystOutcome != null ? analystOutcome : "unknown")
            + (containmentSummary != null ? " — " + containmentSummary : "");

        Map<String, FeatureValue> featureMap = buildFeatureMap(
            alertType, sourceSystem, (String) alert.get("severity"), description,
            techniqueIds, iocTypesList, analystOutcome);

        return new SocIncidentCbrCase(
            problem, solution, null, null, featureMap, null, null,
            alertType, sourceSystem, techniqueIds, iocTypesList,
            analystOutcome, analystOutcome, playbook, 0);
    }

    public static Map<String, FeatureValue> extractRetrievalFeatures(Map<String, Object> context) {
        @SuppressWarnings("unchecked")
        var alert = (Map<String, Object>) context.get("alert");
        if (alert == null) return Map.of();

        var features = new LinkedHashMap<String, FeatureValue>();
        putIfNotNull(features, "alertType", (String) alert.get("type"));
        putIfNotNull(features, "sourceSystem", (String) alert.get("source"));
        putIfNotNull(features, "severity", (String) alert.get("severity"));
        putIfNotNull(features, "alertDescription", (String) alert.get("description"));
        return Map.copyOf(features);
    }

    private static Map<String, FeatureValue> buildFeatureMap(
            String alertType, String sourceSystem, String severity, String description,
            List<String> techniqueIds, List<String> iocTypes, String analystOutcome) {
        var features = new LinkedHashMap<String, FeatureValue>();
        putIfNotNull(features, "alertType", alertType);
        putIfNotNull(features, "sourceSystem", sourceSystem);
        putIfNotNull(features, "severity", severity);
        putIfNotNull(features, "alertDescription", description);
        if (!techniqueIds.isEmpty()) {
            features.put("attckTechniqueIds", FeatureValue.stringList(techniqueIds));
        }
        if (!iocTypes.isEmpty()) {
            features.put("iocTypes", FeatureValue.stringList(iocTypes));
        }
        putIfNotNull(features, "severityOutcome", analystOutcome);
        putIfNotNull(features, "containmentOutcome", analystOutcome);
        return Map.copyOf(features);
    }

    private static void putIfNotNull(Map<String, FeatureValue> map, String key, String value) {
        if (value != null) map.put(key, FeatureValue.string(value));
    }
}
