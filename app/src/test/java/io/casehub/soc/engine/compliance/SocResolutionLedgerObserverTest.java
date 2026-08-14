package io.casehub.soc.engine.compliance;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class SocResolutionLedgerObserverTest {

    private StubLedgerEntryRepository repo;
    private SocResolutionLedgerObserver observer;

    @BeforeEach
    void setUp() {
        repo = new StubLedgerEntryRepository();
        var writer = new SocLedgerEntryWriter(repo,
                Clock.fixed(Instant.parse("2026-08-11T12:00:00Z"), ZoneOffset.UTC));
        observer = new SocResolutionLedgerObserver(writer);
    }

    @Test
    void onOutcome_successfulInvestigation_writesResolvedEntry() {
        UUID caseId = UUID.randomUUID();
        observer.onOutcome(new CaseOutcomeEvent(
                SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-1", caseId,
                Map.of("analystOutcome", "CONFIRM_SEVERITY", "analystId", "analyst-1"),
                "resolved", Instant.now(), Map.of()));

        assertThat(repo.lastSaved).isNotNull();
        SocLedgerEntry entry = (SocLedgerEntry) repo.lastSaved;
        assertThat(entry.stepType).isEqualTo(SocStepType.INCIDENT_RESOLVED);
        assertThat(entry.incidentId).isEqualTo(caseId);
        assertThat(entry.metadata).contains("resolutionOutcome");
        assertThat(entry.metadata).contains("CONFIRM_SEVERITY");
        assertThat(entry.actorId).isEqualTo("analyst-1");
        assertThat(entry.actorType).isEqualTo(ActorType.HUMAN);
    }

    @Test
    void onOutcome_nonSocCase_skips() {
        observer.onOutcome(new CaseOutcomeEvent(
                "aml-investigation", "tenant-1", UUID.randomUUID(),
                Map.of(), "resolved", Instant.now(), Map.of()));
        assertThat(repo.lastSaved).isNull();
    }

    @Test
    void onOutcome_faultedOutcome_skips() {
        observer.onOutcome(new CaseOutcomeEvent(
                SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-1", UUID.randomUUID(),
                Map.of(), "FAULTED", Instant.now(), Map.of()));
        assertThat(repo.lastSaved).isNull();
    }

    @Test
    void onOutcome_missingAnalystId_usesSystemFallback() {
        UUID caseId = UUID.randomUUID();
        observer.onOutcome(new CaseOutcomeEvent(
                SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-1", caseId,
                Map.of("analystOutcome", "CONFIRM_SEVERITY"),
                "resolved", Instant.now(), Map.of()));

        SocLedgerEntry entry = (SocLedgerEntry) repo.lastSaved;
        assertThat(entry.actorId).isEqualTo("system:soc-compliance");
        assertThat(entry.actorType).isEqualTo(ActorType.SYSTEM);
    }

    @Test
    void onOutcome_missingAnalystOutcome_usesOutcomeLabel() {
        UUID caseId = UUID.randomUUID();
        observer.onOutcome(new CaseOutcomeEvent(
                SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-1", caseId,
                Map.of(), "false-positive", Instant.now(), Map.of()));

        SocLedgerEntry entry = (SocLedgerEntry) repo.lastSaved;
        assertThat(entry.metadata).contains("false-positive");
    }
}
