package io.casehub.soc.engine.compliance;

import io.casehub.ledger.api.model.LedgerEntryType;
import io.casehub.ledger.api.spi.LedgerEntryRepository;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocStepType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class SocLedgerEntryWriter {

    private static final Logger LOG = Logger.getLogger(SocLedgerEntryWriter.class);

    private static final Map<SocStepType, Set<String>> REQUIRED_METADATA = Map.ofEntries(
        Map.entry(SocStepType.ALERT_TRIAGE, Set.of("alertSeverity", "assignedSeverity", "triageAgentId")),
        Map.entry(SocStepType.INCIDENT_PROMOTED, Set.of("promotionReason")),
        Map.entry(SocStepType.INVESTIGATION_STEP, Set.of("capabilityTag", "investigationType")),
        Map.entry(SocStepType.CONTAINMENT_DECISION, Set.of("approverId", "riskClassification", "containmentAction")),
        Map.entry(SocStepType.CONTAINMENT_GATE_DECISION, Set.of("actionType", "riskScore", "gateDecision")),
        Map.entry(SocStepType.CONTAINMENT_APPROVAL, Set.of("actionType", "approverId")),
        Map.entry(SocStepType.CONTAINMENT_REJECTION, Set.of("actionType", "rejectorId", "rejectionReason")),
        Map.entry(SocStepType.CONTAINMENT_EXECUTED, Set.of("executionResult", "containmentAction")),
        Map.entry(SocStepType.INCIDENT_RESOLVED, Set.of("resolutionOutcome"))
    );

    private final LedgerEntryRepository ledgerRepo;
    private final Clock clock;

    @Inject
    SocLedgerEntryWriter(LedgerEntryRepository ledgerRepo, Clock clock) {
        this.ledgerRepo = ledgerRepo;
        this.clock = clock;
    }

    public void write(UUID incidentId, SocStepType stepType, String actorId,
                      String actorRole, ActorType actorType, String metadataJson,
                      String tenancyId, UUID causedByEntryId) {
        validateMetadata(stepType, metadataJson);

        SocLedgerEntry entry = new SocLedgerEntry();
        entry.incidentId = incidentId;
        entry.subjectId = incidentId;
        entry.stepType = stepType;
        entry.entryType = LedgerEntryType.EVENT;
        entry.actorId = actorId;
        entry.actorRole = actorRole;
        entry.actorType = actorType;
        entry.occurredAt = clock.instant();
        entry.metadata = metadataJson;
        entry.causedByEntryId = causedByEntryId;

        int nextSeq = ledgerRepo.findLatestBySubjectId(incidentId, tenancyId)
                .map(e -> e.sequenceNumber + 1)
                .orElse(1);
        entry.sequenceNumber = nextSeq;

        ledgerRepo.save(entry, tenancyId);
    }

    private void validateMetadata(SocStepType stepType, String metadataJson) {
        Set<String> required = REQUIRED_METADATA.getOrDefault(stepType, Set.of());
        for (String field : required) {
            if (metadataJson == null || !metadataJson.contains("\"" + field + "\"")) {
                throw new IllegalStateException(
                    "Missing required metadata field '" + field + "' for step type " + stepType);
            }
        }
    }
}
