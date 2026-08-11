package io.casehub.soc.engine.compliance;

import io.casehub.ledger.api.model.LedgerEntryType;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocLedgerEntryWriterTest {

    private StubLedgerEntryRepository repo;
    private SocLedgerEntryWriter writer;
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-08-11T10:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        repo = new StubLedgerEntryRepository();
        writer = new SocLedgerEntryWriter(repo, FIXED_CLOCK);
    }

    @Test
    void write_setsAllRequiredFields() {
        UUID incidentId = UUID.randomUUID();
        UUID causedBy = UUID.randomUUID();
        writer.write(incidentId, SocStepType.ALERT_TRIAGE,
                "agent-1", "triage-agent", ActorType.AGENT,
                "{\"alertSeverity\":\"CRITICAL\",\"assignedSeverity\":\"HIGH\",\"triageAgentId\":\"agent-1\"}",
                "tenant-1", causedBy);

        assertThat(repo.lastSaved).isNotNull();
        SocLedgerEntry entry = (SocLedgerEntry) repo.lastSaved;
        assertThat(entry.incidentId).isEqualTo(incidentId);
        assertThat(entry.subjectId).isEqualTo(incidentId);
        assertThat(entry.stepType).isEqualTo(SocStepType.ALERT_TRIAGE);
        assertThat(entry.actorId).isEqualTo("agent-1");
        assertThat(entry.actorRole).isEqualTo("triage-agent");
        assertThat(entry.actorType).isEqualTo(ActorType.AGENT);
        assertThat(entry.entryType).isEqualTo(LedgerEntryType.EVENT);
        assertThat(entry.occurredAt).isEqualTo(FIXED_CLOCK.instant());
        assertThat(entry.causedByEntryId).isEqualTo(causedBy);
        assertThat(entry.metadata).contains("alertSeverity");
        assertThat(repo.lastTenancyId).isEqualTo("tenant-1");
    }

    @Test
    void write_firstEntry_sequenceNumberIsOne() {
        UUID incidentId = UUID.randomUUID();
        writer.write(incidentId, SocStepType.ALERT_TRIAGE,
                "agent-1", "triage-agent", ActorType.AGENT,
                "{\"alertSeverity\":\"CRITICAL\",\"assignedSeverity\":\"HIGH\",\"triageAgentId\":\"agent-1\"}",
                "tenant-1", null);

        assertThat(((SocLedgerEntry) repo.lastSaved).sequenceNumber).isEqualTo(1);
    }

    @Test
    void write_sequenceNumberIncrements() {
        UUID incidentId = UUID.randomUUID();
        repo.latestSequence = 3;
        writer.write(incidentId, SocStepType.INVESTIGATION_STEP,
                "worker-1", "investigator", ActorType.AGENT,
                "{\"capabilityTag\":\"ioc\",\"investigationType\":\"ioc-enrichment\"}",
                "tenant-1", null);

        assertThat(((SocLedgerEntry) repo.lastSaved).sequenceNumber).isEqualTo(4);
    }

    @Test
    void write_containmentDecision_missingApproverId_throws() {
        UUID incidentId = UUID.randomUUID();
        assertThatThrownBy(() -> writer.write(incidentId,
                SocStepType.CONTAINMENT_DECISION,
                "agent-1", "containment", ActorType.AGENT,
                "{\"riskClassification\":\"HIGH\",\"containmentAction\":\"ISOLATE\"}",
                "tenant-1", null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("approverId");
    }

    @Test
    void write_containmentDecision_allFieldsPresent_succeeds() {
        UUID incidentId = UUID.randomUUID();
        writer.write(incidentId, SocStepType.CONTAINMENT_DECISION,
                "agent-1", "containment", ActorType.AGENT,
                "{\"approverId\":\"analyst-1\",\"riskClassification\":\"HIGH\",\"containmentAction\":\"ISOLATE\"}",
                "tenant-1", null);
        assertThat(repo.lastSaved).isNotNull();
    }

    @Test
    void write_nullCausedByEntryId_accepted() {
        UUID incidentId = UUID.randomUUID();
        writer.write(incidentId, SocStepType.INCIDENT_RESOLVED,
                "analyst-1", "resolution", ActorType.HUMAN,
                "{\"resolutionOutcome\":\"CONFIRM_SEVERITY\"}",
                "tenant-1", null);

        assertThat(((SocLedgerEntry) repo.lastSaved).causedByEntryId).isNull();
    }
}
