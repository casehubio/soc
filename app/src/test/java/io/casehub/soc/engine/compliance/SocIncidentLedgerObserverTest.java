package io.casehub.soc.engine.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class SocIncidentLedgerObserverTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private StubLedgerEntryRepository repo;
    private SocIncidentLedgerObserver observer;

    @BeforeEach
    void setUp() {
        repo = new StubLedgerEntryRepository();
        var writer = new SocLedgerEntryWriter(repo,
                Clock.fixed(Instant.parse("2026-08-11T10:00:00Z"), ZoneOffset.UTC));
        observer = new SocIncidentLedgerObserver(writer);
    }

    @Test
    void triagingStatus_writesAlertTriageEntry() {
        UUID caseId = UUID.randomUUID();
        ObjectNode context = MAPPER.createObjectNode();
        context.putObject("alert").put("severity", "CRITICAL");
        context.put("incidentStatus", "TRIAGING");

        observer.onLifecycle(lifecycleEvent(caseId, "tenant-1", context));

        assertThat(repo.lastSaved).isNotNull();
        SocLedgerEntry entry = (SocLedgerEntry) repo.lastSaved;
        assertThat(entry.stepType).isEqualTo(SocStepType.ALERT_TRIAGE);
        assertThat(entry.incidentId).isEqualTo(caseId);
        assertThat(entry.metadata).contains("alertSeverity");
        assertThat(entry.metadata).contains("CRITICAL");
    }

    @Test
    void investigatingStatus_writesIncidentPromotedEntry() {
        UUID caseId = UUID.randomUUID();

        ObjectNode triageContext = MAPPER.createObjectNode();
        triageContext.putObject("alert").put("severity", "HIGH");
        triageContext.put("incidentStatus", "TRIAGING");
        observer.onLifecycle(lifecycleEvent(caseId, "tenant-1", triageContext));

        repo.lastSaved = null;

        ObjectNode investigateContext = MAPPER.createObjectNode();
        investigateContext.putObject("alert").put("severity", "HIGH");
        investigateContext.put("incidentStatus", "INVESTIGATING");
        observer.onLifecycle(lifecycleEvent(caseId, "tenant-1", investigateContext));

        assertThat(repo.lastSaved).isNotNull();
        SocLedgerEntry entry = (SocLedgerEntry) repo.lastSaved;
        assertThat(entry.stepType).isEqualTo(SocStepType.INCIDENT_PROMOTED);
        assertThat(entry.metadata).contains("promotionReason");
    }

    @Test
    void nonSocCase_skips() {
        UUID caseId = UUID.randomUUID();
        ObjectNode context = MAPPER.createObjectNode();
        context.put("incidentStatus", "TRIAGING");
        context.putObject("alert").put("severity", "HIGH");

        observer.onLifecycle(new CaseLifecycleEvent(
                caseId, "tenant-1", "SubmitWork", "WorkSubmitted",
                "ACTIVE", "agent-1", "worker", null,
                "aml-investigation", "io.casehub.aml",
                context, null, null));
        assertThat(repo.lastSaved).isNull();
    }

    @Test
    void sameStatusTwice_onlyWritesOnce() {
        UUID caseId = UUID.randomUUID();
        ObjectNode context = MAPPER.createObjectNode();
        context.putObject("alert").put("severity", "HIGH");
        context.put("incidentStatus", "TRIAGING");

        observer.onLifecycle(lifecycleEvent(caseId, "tenant-1", context));
        assertThat(repo.lastSaved).isNotNull();

        repo.lastSaved = null;
        observer.onLifecycle(lifecycleEvent(caseId, "tenant-1", context));
        assertThat(repo.lastSaved).isNull();
    }

    @Test
    void nullContextSnapshot_skips() {
        UUID caseId = UUID.randomUUID();
        observer.onLifecycle(new CaseLifecycleEvent(
                caseId, "tenant-1", "SubmitWork", "WorkSubmitted",
                "ACTIVE", "agent-1", "worker", null,
                SocCaseTypes.INCIDENT_INVESTIGATION, "io.casehub.soc",
                null, null, null));
        assertThat(repo.lastSaved).isNull();
    }

    private CaseLifecycleEvent lifecycleEvent(UUID caseId, String tenancyId, ObjectNode context) {
        return new CaseLifecycleEvent(
                caseId, tenancyId, "SubmitWork", "WorkSubmitted",
                "ACTIVE", "system:soc", "worker", null,
                SocCaseTypes.INCIDENT_INVESTIGATION, "io.casehub.soc",
                context, null, null);
    }
}
