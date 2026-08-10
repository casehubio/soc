package io.casehub.soc.engine;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.api.spi.CaseOutcomeObserver;
import io.casehub.ledger.api.model.AttestationVerdict;
import io.casehub.ledger.api.model.LedgerAttestation;
import io.casehub.ledger.api.spi.LedgerEntryRepository;
import io.casehub.ledger.model.WorkerDecisionEntry;
import io.casehub.ledger.repository.CaseLedgerEntryRepository;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocCaseCapabilities;
import io.casehub.soc.domain.SocTrustDimensions;
import io.casehub.soc.engine.cbr.SocCaseOutcomeFilter;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.Clock;
import java.util.List;
import java.util.Map;

import java.util.UUID;

@ApplicationScoped
public class SocAttestationService implements CaseOutcomeObserver {

    private static final Logger LOG = Logger.getLogger(SocAttestationService.class);
    private static final String SYSTEM_ATTESTOR = "system:soc-attestation";
    private final CaseLedgerEntryRepository caseLedgerRepo;
    private final LedgerEntryRepository ledgerRepo;
    private final Clock clock;

    @Inject
    SocAttestationService(CaseLedgerEntryRepository caseLedgerRepo,
                          LedgerEntryRepository ledgerRepo, Clock clock) {
        this.caseLedgerRepo = caseLedgerRepo;
        this.ledgerRepo = ledgerRepo;
        this.clock = clock;
    }

    @Override
    public void onOutcome(CaseOutcomeEvent event) {
        if (!SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)) {return;}
        processOutcome(event);}

    void processOutcome(CaseOutcomeEvent event) {
        Map<String, Object> snapshot = event.caseFileSnapshot();
        String analystOutcome = resolveAnalystOutcome(snapshot, event.outcomeLabel());
        String analystId = resolveAnalystId(snapshot);
        ActorType attestorType = SYSTEM_ATTESTOR.equals(analystId)
                ? ActorType.SYSTEM : ActorType.HUMAN;

        List<WorkerDecisionEntry> decisions =
                caseLedgerRepo.findWorkerDecisionsByCaseId(event.caseId());
        if (decisions.isEmpty()) {
            LOG.warnf("No WorkerDecisionEntries for caseId=%s — skipping attestation", event.caseId());
            return;
        }

        AttestationVerdict triageVerdict = triageVerdict(analystOutcome);

        for (WorkerDecisionEntry entry : decisions) {
            writeIfAbsent(entry, SocTrustDimensions.TRIAGE_ACCURACY, triageVerdict,
                    analystId, attestorType, analystOutcome, event);

            if (SocCaseCapabilities.CONTAINMENT_RECOMMENDATION.equals(entry.capabilityTag)
                    && ("CONFIRM_SEVERITY".equals(analystOutcome)
                        || "DOWNGRADE".equals(analystOutcome))) {
                AttestationVerdict containmentVerdict =
                        "DOWNGRADE".equals(analystOutcome)
                                ? AttestationVerdict.FLAGGED : AttestationVerdict.SOUND;
                writeIfAbsent(entry, SocTrustDimensions.CONTAINMENT_APPROPRIATENESS,
                        containmentVerdict, analystId, attestorType, analystOutcome, event);
            }
        }
    }

    private void writeIfAbsent(WorkerDecisionEntry entry, String dimension,
            AttestationVerdict verdict, String attestorId, ActorType attestorType,
            String analystOutcome, CaseOutcomeEvent event) {
        boolean exists = ledgerRepo.findAttestationsByEntryId(entry.id, event.tenancyId())
                .stream()
                .anyMatch(a -> dimension.equals(a.trustDimension));
        if (exists) return;

        LedgerAttestation attestation = new LedgerAttestation();
        attestation.id = UUID.randomUUID();
        attestation.ledgerEntryId = entry.id;
        attestation.subjectId = event.caseId();
        attestation.attestorId = attestorId;
        attestation.attestorType = attestorType;
        attestation.attestorRole = "analyst-review-outcome";
        attestation.verdict = verdict;
        attestation.capabilityTag = entry.capabilityTag;
        attestation.trustDimension = dimension;
        attestation.confidence = 1.0;
        attestation.evidence = "analystOutcome=" + analystOutcome;
        attestation.occurredAt = clock.instant();

        try {
            ledgerRepo.saveAttestation(attestation, event.tenancyId());
        } catch (Exception e) {
            LOG.errorf(e, "Failed to save attestation for entryId=%s dimension=%s — attestation lost",
                    entry.id, dimension);
        }
    }

    private static AttestationVerdict triageVerdict(String analystOutcome) {
        return "FALSE_POSITIVE".equals(analystOutcome)
                ? AttestationVerdict.FLAGGED : AttestationVerdict.SOUND;
    }

    private static String resolveAnalystOutcome(Map<String, Object> snapshot, String outcomeLabel) {
        Object outcome = snapshot.get("analystOutcome");
        if (outcome instanceof String s && !s.isBlank()) return s;
        LOG.warnf("analystOutcome missing from context — inferring from outcomeLabel=%s", outcomeLabel);
        return switch (outcomeLabel) {
            case "false-positive" -> "FALSE_POSITIVE";
            case "escalated" -> "ESCALATE";
            default -> "CONFIRM_SEVERITY";
        };
    }

    private static String resolveAnalystId(Map<String, Object> snapshot) {
        Object id = snapshot.get("analystId");
        if (id instanceof String s && !s.isBlank()) return s;
        return SYSTEM_ATTESTOR;
    }
}
