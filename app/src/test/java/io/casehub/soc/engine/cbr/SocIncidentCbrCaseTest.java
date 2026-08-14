package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.cbr.CbrCase;
import io.casehub.neocortex.memory.cbr.FeatureValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SocIncidentCbrCaseTest {

    @Test
    void cbrType_isSocIncident() {
        assertThat(SocIncidentCbrCase.CBR_TYPE).isEqualTo("soc-incident");
    }

    @Test
    void implementsCbrCase() {
        var cbrCase = minimalCase();
        assertThat(cbrCase).isInstanceOf(CbrCase.class);
        assertThat(cbrCase.cbrType()).isEqualTo("soc-incident");
    }

    @Test
    void withOutcome_returnsNewInstance() {
        var original = minimalCase();
        var updated = (SocIncidentCbrCase) original.withOutcome("COMPLETED", 0.95);
        assertThat(updated.outcome()).isEqualTo("COMPLETED");
        assertThat(updated.confidence()).isEqualTo(0.95);
        assertThat(updated.alertType()).isEqualTo(original.alertType());
    }

    @Test
    void withFeatures_returnsNewInstance() {
        var original = minimalCase();
        var newFeatures = Map.of("alertType", (FeatureValue) FeatureValue.string("phishing"));
        var updated = (SocIncidentCbrCase) original.withFeatures(newFeatures);
        assertThat(updated.features()).containsKey("alertType");
        assertThat(original.features()).isEmpty();
    }

    @Test
    void fromSnapshot_extractsAllFields() {
        Map<String, Object> snapshot = Map.of(
            "alert", Map.of("type", "malware", "source", "siem-1",
                            "severity", "HIGH", "description", "Ransomware detected"),
            "attckMapping", Map.of("techniques", List.of(
                Map.of("id", "T1486"), Map.of("id", "T1059"))),
            "iocEnrichment", Map.of("iocTypes", List.of("hash", "ip")),
            "analystOutcome", "CONFIRM_SEVERITY",
            "containmentRecommendation", Map.of("playbook", "isolate-host",
                                                 "summary", "Isolate affected host"));

        var event = TestCaseOutcomeEvents.resolved("tenant-1");
        var cbrCase = SocIncidentCbrCase.fromSnapshot(snapshot, event);

        assertThat(cbrCase.alertType()).isEqualTo("malware");
        assertThat(cbrCase.sourceSystem()).isEqualTo("siem-1");
        assertThat(cbrCase.attckTechniqueIds()).containsExactly("T1486", "T1059");
        assertThat(cbrCase.iocTypes()).containsExactly("hash", "ip");
        assertThat(cbrCase.severityOutcome()).isEqualTo("CONFIRM_SEVERITY");
        assertThat(cbrCase.containmentOutcome()).isEqualTo("CONFIRM_SEVERITY");
        assertThat(cbrCase.playbook()).isEqualTo("isolate-host");
        assertThat(cbrCase.problem()).contains("malware").contains("siem-1");
        assertThat(cbrCase.solution()).contains("CONFIRM_SEVERITY");
    }

    @ParameterizedTest
    @CsvSource({"CONFIRM_SEVERITY", "DOWNGRADE", "ESCALATE", "FALSE_POSITIVE"})
    void fromSnapshot_allOutcomes(String analystOutcome) {
        Map<String, Object> snapshot = Map.of(
            "alert", Map.of("type", "probe", "source", "ids-1",
                            "severity", "LOW", "description", "Port scan"),
            "analystOutcome", analystOutcome);

        var event = TestCaseOutcomeEvents.resolved("tenant-1");
        var cbrCase = SocIncidentCbrCase.fromSnapshot(snapshot, event);
        assertThat(cbrCase.severityOutcome()).isEqualTo(analystOutcome);
        assertThat(cbrCase.containmentOutcome()).isEqualTo(analystOutcome);
    }

    @Test
    void fromSnapshot_missingOptionalFields_usesDefaults() {
        Map<String, Object> snapshot = Map.of(
            "alert", Map.of("type", "unknown", "source", "external"));

        var event = TestCaseOutcomeEvents.resolved("tenant-1");
        var cbrCase = SocIncidentCbrCase.fromSnapshot(snapshot, event);

        assertThat(cbrCase.alertType()).isEqualTo("unknown");
        assertThat(cbrCase.attckTechniqueIds()).isEmpty();
        assertThat(cbrCase.iocTypes()).isEmpty();
        assertThat(cbrCase.severityOutcome()).isNull();
        assertThat(cbrCase.playbook()).isNull();
    }

    @Test
    void extractRetrievalFeatures_fromAlertData() {
        Map<String, Object> context = Map.of(
            "alert", Map.of("type", "phishing", "source", "email-gw",
                            "severity", "MEDIUM", "description", "Credential phishing attempt"));

        var features = SocIncidentCbrCase.extractRetrievalFeatures(context);

        assertThat(features).containsEntry("alertType", FeatureValue.string("phishing"));
        assertThat(features).containsEntry("sourceSystem", FeatureValue.string("email-gw"));
        assertThat(features).containsEntry("severity", FeatureValue.string("MEDIUM"));
        assertThat(features).containsEntry("alertDescription", FeatureValue.string("Credential phishing attempt"));
    }

    @Test
    void extractRetrievalFeatures_nullAlert_returnsEmptyMap() {
        var features = SocIncidentCbrCase.extractRetrievalFeatures(Map.of());
        assertThat(features).isEmpty();
    }

    @Test
    void extractRetrievalFeatures_partialAlert_includesAvailableFields() {
        Map<String, Object> context = Map.of(
            "alert", Map.of("type", "malware"));

        var features = SocIncidentCbrCase.extractRetrievalFeatures(context);
        assertThat(features).containsEntry("alertType", FeatureValue.string("malware"));
        assertThat(features).doesNotContainKey("sourceSystem");
        assertThat(features).doesNotContainKey("severity");
    }

    private static SocIncidentCbrCase minimalCase() {
        return new SocIncidentCbrCase(
            "test problem", "test solution", null, null,
            Map.of(), null, null,
            "malware", "siem-1", List.of(), List.of(),
            "CONFIRM_SEVERITY", "CONFIRM_SEVERITY", "isolate-host", 30);
    }
}
