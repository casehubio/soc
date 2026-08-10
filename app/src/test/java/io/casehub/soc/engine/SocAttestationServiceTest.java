package io.casehub.soc.engine;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.ledger.api.model.AttestationVerdict;
import io.casehub.ledger.api.model.LedgerAttestation;
import io.casehub.ledger.api.model.LedgerEntry;
import io.casehub.ledger.api.spi.LedgerEntryRepository;
import io.casehub.ledger.model.WorkerDecisionEntry;
import io.casehub.ledger.repository.CaseLedgerEntryRepository;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocCaseCapabilities;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocTrustDimensions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocAttestationServiceTest {

    private StubCaseLedgerEntryRepository caseLedgerRepo;
    private StubLedgerEntryRepository ledgerRepo;
    private SocAttestationService service;
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-08-10T12:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        caseLedgerRepo = new StubCaseLedgerEntryRepository();
        ledgerRepo = new StubLedgerEntryRepository();
        service = new SocAttestationService(caseLedgerRepo, ledgerRepo, FIXED_CLOCK);
    }

    // ── Filtering ──────────────────────────────────────────────────────

    @Test
    void nonSocCase_noAttestationsWritten() {
        service.onOutcome(event("aml-investigation", "resolved",
                Map.of("analystOutcome", "CONFIRM_SEVERITY")));
        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }

    @Test
    void nonSuccessOutcome_noAttestationsWritten() {
        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "FAULTED",
                Map.of("analystOutcome", "CONFIRM_SEVERITY")));
        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }

    // ── Verdict mapping: triage-accuracy ────────────────────────────────

    @ParameterizedTest
    @CsvSource({
        "CONFIRM_SEVERITY, resolved,       SOUND",
        "DOWNGRADE,        resolved,       SOUND",
        "ESCALATE,         escalated,      SOUND",
        "FALSE_POSITIVE,   false-positive, FLAGGED"
    })
    void triageAccuracyVerdict_perAnalystOutcome(
            String analystOutcome, String outcomeLabel, String expectedVerdict) {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, outcomeLabel,
                caseId, "tenant-1", Map.of("analystOutcome", analystOutcome,
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).hasSize(1);
        LedgerAttestation att = ledgerRepo.savedAttestations.getFirst();
        assertThat(att.trustDimension).isEqualTo(SocTrustDimensions.TRIAGE_ACCURACY);
        assertThat(att.verdict).isEqualTo(AttestationVerdict.valueOf(expectedVerdict));
    }

    // ── Containment-appropriateness ─────────────────────────────────────

    @Test
    void confirmSeverity_containmentWorker_writesTriageAndContainmentAttestations() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).hasSize(2);
        assertThat(ledgerRepo.savedAttestations)
                .extracting(a -> a.trustDimension)
                .containsExactlyInAnyOrder(
                        SocTrustDimensions.TRIAGE_ACCURACY,
                        SocTrustDimensions.CONTAINMENT_APPROPRIATENESS);

        LedgerAttestation containment = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.CONTAINMENT_APPROPRIATENESS.equals(a.trustDimension))
                .findFirst().orElseThrow();
        assertThat(containment.verdict).isEqualTo(AttestationVerdict.SOUND);
    }

    @Test
    void downgrade_containmentWorker_containmentIsFlagged() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "DOWNGRADE",
                                           "analystId", "analyst-1")));

        LedgerAttestation containment = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.CONTAINMENT_APPROPRIATENESS.equals(a.trustDimension))
                .findFirst().orElseThrow();
        assertThat(containment.verdict).isEqualTo(AttestationVerdict.FLAGGED);
    }

    @Test
    void escalate_containmentWorker_noContainmentAttestation() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "escalated",
                caseId, "tenant-1", Map.of("analystOutcome", "ESCALATE",
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).hasSize(1);
        assertThat(ledgerRepo.savedAttestations.getFirst().trustDimension)
                .isEqualTo(SocTrustDimensions.TRIAGE_ACCURACY);
    }

    // ── Attestation fields ──────────────────────────────────────────────

    @Test
    void attestationFields_populatedCorrectly() {
        UUID caseId = UUID.randomUUID();
        UUID entryId = caseLedgerRepo.addWorkerDecision(caseId, "llm-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-jane")));

        LedgerAttestation att = ledgerRepo.savedAttestations.getFirst();
        assertThat(att.ledgerEntryId).isEqualTo(entryId);
        assertThat(att.subjectId).isEqualTo(caseId);
        assertThat(att.attestorId).isEqualTo("analyst-jane");
        assertThat(att.attestorType).isEqualTo(ActorType.HUMAN);
        assertThat(att.attestorRole).isEqualTo("analyst-review-outcome");
        assertThat(att.capabilityTag).isEqualTo(SocCaseCapabilities.IOC_ENRICHMENT);
        assertThat(att.confidence).isEqualTo(1.0);
        assertThat(att.evidence).isEqualTo("analystOutcome=CONFIRM_SEVERITY");
        assertThat(att.occurredAt).isEqualTo(FIXED_CLOCK.instant());
    }

    @Test
    void tenancyIdPassedToSaveAttestation() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-acme", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                               "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedTenancyIds.getFirst()).isEqualTo("tenant-acme");
    }

    // ── Fallbacks ───────────────────────────────────────────────────────

    @Test
    void missingAnalystOutcome_infersFromOutcomeLabel() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "false-positive",
                caseId, "tenant-1", Map.of()));

        assertThat(ledgerRepo.savedAttestations).hasSize(1);
        assertThat(ledgerRepo.savedAttestations.getFirst().verdict)
                .isEqualTo(AttestationVerdict.FLAGGED);
    }

    @Test
    void missingAnalystId_usesSystemFallback() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY")));

        LedgerAttestation att = ledgerRepo.savedAttestations.getFirst();
        assertThat(att.attestorId).isEqualTo("system:soc-attestation");
        assertThat(att.attestorType).isEqualTo(ActorType.SYSTEM);
    }

    @Test
    void noWorkerDecisions_noAttestationsWritten() {
        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                UUID.randomUUID(), "tenant-1",
                Map.of("analystOutcome", "CONFIRM_SEVERITY")));
        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }

    // ── Idempotency ─────────────────────────────────────────────────────

    @Test
    void duplicateEvent_idempotencyGuardSkipsExistingAttestations() {
        UUID caseId = UUID.randomUUID();
        UUID entryId = caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        ledgerRepo.addExistingAttestation(entryId, SocTrustDimensions.TRIAGE_ACCURACY);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }

    // ── Multiple workers ────────────────────────────────────────────────

    @Test
    void multipleWorkers_eachGetsTriageAttestation() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);
        caseLedgerRepo.addWorkerDecision(caseId, "llm-attck-mapping",
                SocCaseCapabilities.ATTCK_MAPPING);
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-1")));

        long triageCount = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.TRIAGE_ACCURACY.equals(a.trustDimension))
                .count();
        long containmentCount = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.CONTAINMENT_APPROPRIATENESS.equals(a.trustDimension))
                .count();

        assertThat(triageCount).isEqualTo(3);
        assertThat(containmentCount).isEqualTo(1);
        assertThat(ledgerRepo.savedAttestations).hasSize(4);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static CaseOutcomeEvent event(String caseType, String outcomeLabel,
            Map<String, Object> snapshot) {
        return event(caseType, outcomeLabel, UUID.randomUUID(), "tenant-1", snapshot);
    }

    private static CaseOutcomeEvent event(String caseType, String outcomeLabel,
            UUID caseId, String tenancyId, Map<String, Object> snapshot) {
        return new CaseOutcomeEvent(caseType, tenancyId, caseId, snapshot,
                outcomeLabel, Instant.now(), Map.of());
    }

    static class StubCaseLedgerEntryRepository extends CaseLedgerEntryRepository {
        private final Map<UUID, List<WorkerDecisionEntry>> entriesByCaseId = new HashMap<>();

        UUID addWorkerDecision(UUID caseId, String workerId, String capabilityTag) {
            WorkerDecisionEntry entry = new WorkerDecisionEntry();
            entry.id = UUID.randomUUID();
            entry.workerId = workerId;
            entry.capabilityTag = capabilityTag;
            entry.caseId = caseId;
            entriesByCaseId.computeIfAbsent(caseId, k -> new ArrayList<>()).add(entry);
            return entry.id;
        }

        @Override
        public List<WorkerDecisionEntry> findWorkerDecisionsByCaseId(UUID caseId) {
            return entriesByCaseId.getOrDefault(caseId, List.of());
        }
    }

    static class StubLedgerEntryRepository implements LedgerEntryRepository {
        final List<LedgerAttestation> savedAttestations = new ArrayList<>();
        final List<String> savedTenancyIds = new ArrayList<>();
        private final Map<UUID, List<LedgerAttestation>> existingAttestations = new HashMap<>();

        void addExistingAttestation(UUID entryId, String trustDimension) {
            LedgerAttestation att = new LedgerAttestation();
            att.id = UUID.randomUUID();
            att.ledgerEntryId = entryId;
            att.trustDimension = trustDimension;
            existingAttestations.computeIfAbsent(entryId, k -> new ArrayList<>()).add(att);
        }

        @Override
        public LedgerAttestation saveAttestation(LedgerAttestation attestation, String tenancyId) {
            savedAttestations.add(attestation);
            savedTenancyIds.add(tenancyId);
            return attestation;
        }

        @Override
        public List<LedgerAttestation> findAttestationsByEntryId(UUID entryId, String tenancyId) {
            return existingAttestations.getOrDefault(entryId, List.of());
        }

        @Override public LedgerEntry save(LedgerEntry e, String t) { return e; }
        @Override public List<LedgerEntry> findBySubjectId(UUID s, String t) { return List.of(); }
        @Override public List<LedgerEntry> findBySubjectIdAndTimeRange(UUID s, Instant f, Instant to, String t) { return List.of(); }
        @Override public Optional<LedgerEntry> findLatestBySubjectId(UUID s, String t) { return Optional.empty(); }
        @Override public Optional<LedgerEntry> findEntryById(UUID i, String t) { return Optional.empty(); }
        @Override public List<LedgerEntry> findByActorId(String a, Instant f, Instant to, String t) { return List.of(); }
        @Override public List<LedgerEntry> findByActorRole(String r, Instant f, Instant to, String t) { return List.of(); }
        @Override public List<LedgerEntry> findCausedBy(UUID e, String t) { return List.of(); }
        @Override public List<LedgerAttestation> findAttestationsByEntryIdAndCapabilityTag(UUID e, String c, String t) { return List.of(); }
        @Override public List<LedgerAttestation> findAttestationsByEntryIdGlobal(UUID e, String t) { return List.of(); }
        @Override public List<LedgerAttestation> findAttestationsByAttestorIdAndCapabilityTag(String a, String c, String t) { return List.of(); }
    }
}
