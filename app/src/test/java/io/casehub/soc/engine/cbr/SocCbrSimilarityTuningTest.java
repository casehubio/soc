package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.cbr.CbrCase;
import io.casehub.neocortex.memory.cbr.CbrQuery;
import io.casehub.neocortex.memory.cbr.FeatureValue;
import io.casehub.neocortex.memory.cbr.ScoredCbrCase;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SocCbrSimilarityTuningTest {

    @ParameterizedTest
    @CsvSource({
        "credential-harvesting, crowdstrike, CRITICAL, Credential theft, credential-harvesting",
        "brute-force, auth-service, MEDIUM, Failed logins, brute-force",
        "malware-execution, crowdstrike, HIGH, Ransomware payload, malware-execution",
        "phishing, email-gateway, MEDIUM, Phishing email, phishing",
        "lateral-movement, network-ids, HIGH, SMB lateral movement, lateral-movement"
    })
    void similarAlertRetrievesMatchingIncident(
            String alertType, String source, String severity,
            String description, String expectedMatch) {
        var store = new MatchingCbrStore();
        SocCbrSeedDataLoader.seedIncidents().forEach(store::addCase);
        var service = new SocCbrRetrieveService(store);

        Map<String, Object> context = Map.of(
            "alert", Map.of("type", alertType, "source", source,
                "severity", severity, "description", description));

        var results = service.retrieve(context, "tenant-1");
        assertThat(results).as("should retrieve at least one match for %s", alertType)
            .isNotEmpty();
        assertThat(results.getFirst().get("alertType")).isEqualTo(expectedMatch);
    }

    static class MatchingCbrStore extends StubCbrCaseMemoryStore {
        private final List<SocIncidentCbrCase> cases = new ArrayList<>();

        void addCase(SocIncidentCbrCase c) { cases.add(c); }

        @Override
        @SuppressWarnings("unchecked")
        public <C extends CbrCase> List<ScoredCbrCase<C>> retrieveSimilar(CbrQuery q, Class<C> t) {
            var queryFeatures = q.features();
            String queryAlertType = queryFeatures.containsKey("alertType")
                                    ? ((FeatureValue.StringVal) queryFeatures.get("alertType")).value() : "";
            String querySource = queryFeatures.containsKey("sourceSystem")
                                 ? ((FeatureValue.StringVal) queryFeatures.get("sourceSystem")).value() : "";

            return cases.stream()
                        .map(c -> {
                            double score = c.alertType().equals(queryAlertType) ? 0.95
                                                                                : c.sourceSystem().equals(querySource) ? 0.5 : 0.1;
                            return (ScoredCbrCase<C>) new ScoredCbrCase<>((C) c, "case-" + cases.indexOf(c), score);
                        })
                        .filter(s -> s.score() >= 0.3)
                        .sorted((a, b) -> Double.compare(b.score(), a.score()))
                        .toList();
        }
    }
}
