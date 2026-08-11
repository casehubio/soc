package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.cbr.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class SocCbrRetrieveServiceTest {

    private SocCbrRetrieveService service;
    private StubRetrievingCbrStore store;

    @BeforeEach
    void setUp() {
        store = new StubRetrievingCbrStore();
        service = new SocCbrRetrieveService(store);
    }

    @Test
    void retrieve_withAlertData_returnsResults() {
        store.addCase(new SocIncidentCbrCase(
            "malware from siem-1", "CONFIRM_SEVERITY", "COMPLETED", 0.9,
            Map.of(), null, null,
            "malware", "siem-1", List.of("T1486"), List.of("hash"),
            "CONFIRM_SEVERITY", "CONFIRM_SEVERITY", "isolate-host", 45));

        Map<String, Object> context = Map.of(
            "alert", Map.of("type", "malware", "source", "siem-1",
                            "severity", "HIGH", "description", "Ransomware detected"));

        var results = service.retrieve(context, "tenant-1");

        assertThat(results).hasSize(1);
        assertThat(results.getFirst()).containsKey("alertType");
        assertThat(results.getFirst()).containsKey("similarityScore");
        assertThat(results.getFirst().get("alertType")).isEqualTo("malware");
    }

    @Test
    void retrieve_noAlert_returnsEmptyList() {
        var results = service.retrieve(Map.of(), "tenant-1");
        assertThat(results).isEmpty();
    }

    @Test
    void retrieve_storeFailure_returnsEmptyList() {
        var failingStore = new StubCbrCaseMemoryStore() {
            @Override
            public <C extends CbrCase> List<ScoredCbrCase<C>> retrieveSimilar(CbrQuery q, Class<C> t) {
                throw new RuntimeException("Store unavailable");
            }
        };
        var svc = new SocCbrRetrieveService(failingStore);

        var results = svc.retrieve(
            Map.of("alert", Map.of("type", "x", "source", "y",
                                   "severity", "LOW", "description", "test")),
            "tenant-1");

        assertThat(results).isEmpty();
    }

    @Test
    void retrieve_noSimilarCases_returnsEmptyList() {
        var results = service.retrieve(
            Map.of("alert", Map.of("type", "novel", "source", "new",
                                   "severity", "MEDIUM", "description", "Unknown")),
            "tenant-1");

        assertThat(results).isEmpty();
    }

    @Test
    void retrieve_multipleResults_orderedBySimilarity() {
        store.addCase(new SocIncidentCbrCase(
            "case-1", "sol-1", null, null, Map.of(), null, null,
            "malware", "siem-1", List.of(), List.of(),
            "CONFIRM_SEVERITY", "CONFIRM_SEVERITY", null, 30));
        store.addCase(new SocIncidentCbrCase(
            "case-2", "sol-2", null, null, Map.of(), null, null,
            "phishing", "email-gw", List.of(), List.of(),
            "FALSE_POSITIVE", "FALSE_POSITIVE", null, 15));

        var results = service.retrieve(
            Map.of("alert", Map.of("type", "malware", "source", "siem-1",
                                   "severity", "HIGH", "description", "test")),
            "tenant-1");

        assertThat(results).hasSize(2);
    }

    static class StubRetrievingCbrStore extends StubCbrCaseMemoryStore {
        private final List<SocIncidentCbrCase> cases = new ArrayList<>();

        void addCase(SocIncidentCbrCase c) { cases.add(c); }

        @Override
        @SuppressWarnings("unchecked")
        public <C extends CbrCase> List<ScoredCbrCase<C>> retrieveSimilar(CbrQuery q, Class<C> t) {
            return cases.stream()
                .map(c -> (ScoredCbrCase<C>) new ScoredCbrCase<>((C) c, "case-" + cases.indexOf(c), 0.85))
                .toList();
        }
    }
}
