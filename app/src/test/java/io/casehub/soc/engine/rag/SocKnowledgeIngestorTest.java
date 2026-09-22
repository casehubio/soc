package io.casehub.soc.engine.rag;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.neocortex.rag.ChunkInput;
import io.casehub.neocortex.rag.CorpusRef;
import io.casehub.neocortex.rag.testing.InMemoryEmbeddingIngestor;
import io.casehub.soc.domain.SocCaseTypes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocKnowledgeIngestorTest {

    private InMemoryEmbeddingIngestor ingestor;
    private SocKnowledgeIngestor service;

    @BeforeEach
    void setUp() {
        ingestor = new InMemoryEmbeddingIngestor();
        service = new SocKnowledgeIngestor(ingestor);
    }

    @Test
    void ingestsNarrativeChunkForResolvedIncident() {
        var event = resolvedEvent("tenant-acme", Map.of(
            "alert", Map.of("type", "malware", "source", "siem-1",
                            "description", "Ransomware detected on host-42"),
            "analystOutcome", "CONFIRM_SEVERITY",
            "attckMapping", Map.of("techniques", List.of(
                Map.of("id", "T1486", "technique", "Data Encrypted for Impact"))),
            "containmentRecommendation", Map.of(
                "playbook", "isolate-and-wipe", "summary", "Isolated host and wiped")));

        service.ingest(event);

        var corpus = new CorpusRef("tenant-acme", SocKnowledgeConstants.CORPUS_NAME);
        var chunks = ingestor.getChunks(corpus);
        assertThat(chunks).hasSize(1);

        ChunkInput chunk = chunks.get(0);
        assertThat(chunk.content()).contains("Ransomware detected on host-42");
        assertThat(chunk.content()).contains("CONFIRM_SEVERITY");
        assertThat(chunk.sourceDocumentId()).isEqualTo(event.caseId().toString());
    }

    @Test
    void chunkMetadataIncludesAlertTypeAndTechniques() {
        var event = resolvedEvent("tenant-acme", Map.of(
            "alert", Map.of("type", "brute-force", "source", "ids"),
            "attckMapping", Map.of("techniques", List.of(
                Map.of("id", "T1110"), Map.of("id", "T1078")))));

        service.ingest(event);

        var corpus = new CorpusRef("tenant-acme", SocKnowledgeConstants.CORPUS_NAME);
        var chunk = ingestor.getChunks(corpus).get(0);
        assertThat(chunk.metadata())
            .containsEntry("type", "incident-postmortem")
            .containsEntry("alertType", "brute-force")
            .containsEntry("sourceSystem", "ids");
        assertThat(chunk.listMetadata())
            .containsEntry("attckTechniqueIds", List.of("T1110", "T1078"));
    }

    @Test
    void narrativeIncludesContainmentAndPlaybookWhenPresent() {
        var event = resolvedEvent("t1", Map.of(
            "alert", Map.of("type", "phishing", "description", "Spear phish link clicked"),
            "analystOutcome", "ESCALATED",
            "containmentRecommendation", Map.of(
                "playbook", "quarantine-email", "summary", "Quarantined mailbox")));

        service.ingest(event);

        var chunk = ingestor.getChunks(
            new CorpusRef("t1", SocKnowledgeConstants.CORPUS_NAME)).get(0);
        assertThat(chunk.content()).contains("quarantine-email");
        assertThat(chunk.content()).contains("Quarantined mailbox");
    }

    @Test
    void handlesMinimalSnapshotWithAlertOnly() {
        var event = resolvedEvent("t1", Map.of(
            "alert", Map.of("type", "anomaly")));

        service.ingest(event);

        var chunks = ingestor.getChunks(
            new CorpusRef("t1", SocKnowledgeConstants.CORPUS_NAME));
        assertThat(chunks).hasSize(1);
        assertThat(chunks.get(0).content()).contains("anomaly");
    }

    @Test
    void handlesEmptySnapshot() {
        var event = resolvedEvent("t1", Map.of());

        service.ingest(event);

        var chunks = ingestor.getChunks(
            new CorpusRef("t1", SocKnowledgeConstants.CORPUS_NAME));
        assertThat(chunks).hasSize(1);
        assertThat(chunks.get(0).metadata()).containsEntry("type", "incident-postmortem");
    }

    @Test
    void usesPerTenantCorpus() {
        service.ingest(resolvedEvent("tenant-a", Map.of("alert", Map.of("type", "a"))));
        service.ingest(resolvedEvent("tenant-b", Map.of("alert", Map.of("type", "b"))));

        assertThat(ingestor.getChunks(
            new CorpusRef("tenant-a", SocKnowledgeConstants.CORPUS_NAME))).hasSize(1);
        assertThat(ingestor.getChunks(
            new CorpusRef("tenant-b", SocKnowledgeConstants.CORPUS_NAME))).hasSize(1);
    }

    @Test
    void ingestionFailureDoesNotThrow() {
        var failingIngestor = new InMemoryEmbeddingIngestor() {
            @Override
            public void ingest(CorpusRef corpus, List<ChunkInput> chunks) {
                throw new RuntimeException("Storage unavailable");
            }
        };
        var svc = new SocKnowledgeIngestor(failingIngestor);

        svc.ingest(resolvedEvent("t1", Map.of("alert", Map.of("type", "test"))));
    }

    private static CaseOutcomeEvent resolvedEvent(String tenantId, Map<String, Object> snapshot) {
        return new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION,
            tenantId, UUID.randomUUID(), snapshot, "resolved",
            Instant.parse("2026-09-22T12:00:00Z"), Map.of());
    }
}
