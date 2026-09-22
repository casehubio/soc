package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.CbrRecord;
import io.casehub.neocortex.rag.testing.InMemoryEmbeddingIngestor;
import io.casehub.platform.api.path.Path;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.engine.rag.SocKnowledgeIngestor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocCbrRetainServiceTest {

    private CapturingCbrStore store;
    private SocCbrRetainService service;

    @BeforeEach
    void setUp() {
        store   = new CapturingCbrStore();
        service = new SocCbrRetainService(store, new SocKnowledgeIngestor(new InMemoryEmbeddingIngestor()));
    }

    @Test
    void nonSocCase_noStore() {
        var event = new CaseOutcomeEvent("aml-investigation", "t1", UUID.randomUUID(),
            Map.of(), "resolved", Instant.now(), Map.of());
        service.onOutcome(event);
        assertThat(store.storedCases).isEmpty();
    }

    @Test
    void faultedOutcome_noStore() {
        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
            UUID.randomUUID(), Map.of(), "FAULTED", Instant.now(), Map.of());
        service.onOutcome(event);
        assertThat(store.storedCases).isEmpty();
    }

    @Test
    void resolvedIncident_storesCase() {
        UUID caseId = UUID.randomUUID();
        Map<String, Object> snapshot = Map.of(
            "alert", Map.of("type", "malware", "source", "siem-1",
                            "severity", "HIGH", "description", "Ransomware"),
            "analystOutcome", "CONFIRM_SEVERITY",
            "containmentRecommendation", Map.of("playbook", "isolate", "summary", "Isolate host"));

        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-acme",
            caseId, snapshot, "resolved", Instant.parse("2026-08-11T12:00:00Z"), Map.of());

        service.onOutcome(event);

        assertThat(store.storedCases).hasSize(1);
        var stored = store.storedCases.getFirst();
        assertThat(stored.cbrRecord().alertType()).isEqualTo("malware");
        assertThat(stored.tenantId()).isEqualTo("tenant-acme");
        assertThat(stored.caseId()).isEqualTo(caseId.toString());
        assertThat(stored.cbrType()).isEqualTo(SocIncidentCbrCase.CBR_TYPE);
    }

    @Test
    void falsePositiveOutcome_storesCase() {
        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
            UUID.randomUUID(),
            Map.of("alert", Map.of("type", "probe", "source", "ids"),
                   "analystOutcome", "FALSE_POSITIVE"),
            "false-positive", Instant.now(), Map.of());

        service.onOutcome(event);
        assertThat(store.storedCases).hasSize(1);
        assertThat(store.storedCases.getFirst().cbrRecord().severityOutcome()).isEqualTo("FALSE_POSITIVE");
    }

    @Test
    void storeFailure_logsAndContinues() {
        var failingStore = new StubCbrCaseMemoryStore() {
            @Override
            public String store(CbrRecord c, String t, String e, MemoryDomain d,
                                String tid, String cid, Path s) {
                throw new RuntimeException("Store unavailable");
            }
        };
        var svc = new SocCbrRetainService(failingStore, new SocKnowledgeIngestor(new InMemoryEmbeddingIngestor()));

        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
                                         UUID.randomUUID(),
                                         Map.of("alert", Map.of("type", "malware", "source", "siem"),
                                                "analystOutcome", "CONFIRM_SEVERITY"),
                                         "resolved", Instant.now(), Map.of());

        svc.onOutcome(event);
    }

    @Test
    void resolvedIncident_ingestsKnowledge() {
        var embeddingIngestor = new InMemoryEmbeddingIngestor();
        var knowledgeIngestor = new SocKnowledgeIngestor(embeddingIngestor);
        var svc               = new SocCbrRetainService(new CapturingCbrStore(), knowledgeIngestor);

        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-acme",
                                         UUID.randomUUID(),
                                         Map.of("alert", Map.of("type", "malware", "source", "siem-1",
                                                                "description", "Ransomware detected"),
                                                "analystOutcome", "CONFIRM_SEVERITY"),
                                         "resolved", Instant.now(), Map.of());

        svc.onOutcome(event);

        var corpus = new io.casehub.neocortex.rag.CorpusRef(
                "tenant-acme", io.casehub.soc.engine.rag.SocKnowledgeConstants.CORPUS_NAME);
        assertThat(embeddingIngestor.getChunks(corpus)).hasSize(1);
    }

    @Test
    void knowledgeIngestionFailure_doesNotPreventCbrStore() {
        var failingEmbeddingIngestor = new InMemoryEmbeddingIngestor() {
            @Override
            public void ingest(io.casehub.neocortex.rag.CorpusRef corpus,
                               java.util.List<io.casehub.neocortex.rag.ChunkInput> chunks) {
                throw new RuntimeException("Embedding unavailable");
            }
        };
        var knowledgeIngestor = new SocKnowledgeIngestor(failingEmbeddingIngestor);
        var capturingStore    = new CapturingCbrStore();
        var svc               = new SocCbrRetainService(capturingStore, knowledgeIngestor);

        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
                                         UUID.randomUUID(),
                                         Map.of("alert", Map.of("type", "malware", "source", "siem"),
                                                "analystOutcome", "CONFIRM_SEVERITY"),
                                         "resolved", Instant.now(), Map.of());

        svc.onOutcome(event);

        assertThat(capturingStore.storedCases).hasSize(1);
    }


    static class CapturingCbrStore extends StubCbrCaseMemoryStore {
        record StoredEntry(SocIncidentCbrCase cbrRecord, String cbrType,
                          String tenantId, String caseId) {}
        final List<StoredEntry> storedCases = new ArrayList<>();

        @Override
        public String store(CbrRecord c, String t, String e, MemoryDomain d,
                           String tid, String cid, Path s) {
            storedCases.add(new StoredEntry((SocIncidentCbrCase) c, t, tid, cid));
            return cid;
        }
    }
}
