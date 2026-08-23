package io.casehub.soc.engine.compliance;

import io.casehub.soc.domain.DoraResponseTimeReport;
import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class SocComplianceServiceTest {

    private SocComplianceService service;
    private StubSocRepo repo;
    private SocPiiSanitiser sanitiser;

    @BeforeEach
    void setUp() {
        repo = new StubSocRepo();
        sanitiser = new SocPiiSanitiser();
        service = new SocComplianceService(null, repo, sanitiser);
    }

    @Test
    void doraReport_singleIncident_computesDurations() {
        UUID incidentId = UUID.randomUUID();
        Instant base = Instant.parse("2026-08-01T10:00:00Z");

        repo.timeRangeEntries = List.of(
            socEntry(incidentId, SocStepType.ALERT_TRIAGE, base,
                    "{\"alertSeverity\":\"CRITICAL\",\"assignedSeverity\":\"CRITICAL\",\"triageAgentId\":\"a1\"}", 1),
            socEntry(incidentId, SocStepType.CONTAINMENT_DECISION, base.plus(Duration.ofMinutes(5)),
                    "{\"approverId\":\"analyst-1\",\"riskClassification\":\"HIGH\",\"containmentAction\":\"ISOLATE\"}", 2),
            socEntry(incidentId, SocStepType.INCIDENT_RESOLVED, base.plus(Duration.ofMinutes(10)),
                    "{\"resolutionOutcome\":\"CONFIRM_SEVERITY\"}", 3)
        );

        DoraResponseTimeReport report = service.doraReport(
                base.minus(Duration.ofHours(1)), base.plus(Duration.ofHours(1)), "tenant-1");

        assertThat(report.totalIncidents()).isEqualTo(1);
        assertThat(report.byPriority()).containsKey("CRITICAL");
        var stats = report.byPriority().get("CRITICAL");
        assertThat(stats.count()).isEqualTo(1);
        assertThat(stats.avgTimeToResolution()).isEqualTo(Duration.ofMinutes(10));
        assertThat(stats.avgTimeToContainment()).isEqualTo(Duration.ofMinutes(5));
    }

    @Test
    void doraReport_slaCompliance_withinWindow() {
        UUID incidentId = UUID.randomUUID();
        Instant base = Instant.parse("2026-08-01T10:00:00Z");

        repo.timeRangeEntries = List.of(
            socEntry(incidentId, SocStepType.ALERT_TRIAGE, base,
                    "{\"alertSeverity\":\"CRITICAL\",\"assignedSeverity\":\"CRITICAL\",\"triageAgentId\":\"a1\"}", 1),
            socEntry(incidentId, SocStepType.INCIDENT_RESOLVED, base.plus(Duration.ofMinutes(10)),
                    "{\"resolutionOutcome\":\"CONFIRM_SEVERITY\"}", 2)
        );

        DoraResponseTimeReport report = service.doraReport(
                base.minus(Duration.ofHours(1)), base.plus(Duration.ofHours(1)), "tenant-1");

        assertThat(report.byPriority().get("CRITICAL").slaCompliancePercent()).isEqualTo(1.0);
    }

    @Test
    void doraReport_noData_returnsEmptyReport() {
        repo.timeRangeEntries = List.of();
        Instant from = Instant.parse("2026-08-01T00:00:00Z");
        Instant to = Instant.parse("2026-08-31T23:59:59Z");

        DoraResponseTimeReport report = service.doraReport(from, to, "tenant-1");

        assertThat(report.totalIncidents()).isEqualTo(0);
        assertThat(report.byPriority()).isEmpty();
    }

    @Test
    void incidentTimeline_sanitisesPii() {
        UUID incidentId = UUID.randomUUID();
        repo.incidentEntries = List.of(
            socEntry(incidentId, SocStepType.ALERT_TRIAGE, Instant.now(),
                    "{\"src_ip\":\"10.0.0.1\",\"alertSeverity\":\"HIGH\",\"assignedSeverity\":\"HIGH\",\"triageAgentId\":\"a1\"}", 1)
        );

        List<SocLedgerEntry> timeline = service.incidentTimeline(incidentId, "tenant-1");

        assertThat(timeline).hasSize(1);
        assertThat(timeline.getFirst().metadata).contains("[REDACTED-IP]");
        assertThat(timeline.getFirst().metadata).doesNotContain("10.0.0.1");
    }

    @Test
    void incidentTimeline_returnsDetachedCopies() {
        UUID incidentId = UUID.randomUUID();
        SocLedgerEntry original = socEntry(incidentId, SocStepType.ALERT_TRIAGE, Instant.now(),
                "{\"alertSeverity\":\"HIGH\",\"assignedSeverity\":\"HIGH\",\"triageAgentId\":\"a1\"}", 1);
        repo.incidentEntries = List.of(original);

        List<SocLedgerEntry> timeline = service.incidentTimeline(incidentId, "tenant-1");

        assertThat(timeline.getFirst()).isNotSameAs(original);
        assertThat(original.metadata).doesNotContain("[REDACTED");
    }

    @Test
    void filteredEntries_sanitisesMetadata() {
        var entry = socEntry(UUID.randomUUID(), SocStepType.ALERT_TRIAGE,
                             Instant.parse("2026-01-01T10:00:00Z"),
                             "{\"triageAgentId\":\"agent@soc.example.com\",\"alertSeverity\":\"HIGH\"}", 1);
        repo.filteredEntries = List.of(entry);
        repo.filteredCount   = 1;

        PagedAuditEntries result = service.filteredEntries(
                Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-02T00:00:00Z"),
                null, null, null, 0, 50, "tenant-1");

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().getFirst().metadata).doesNotContain("agent@soc.example.com");
        assertThat(result.content().getFirst().metadata).contains("[REDACTED-EMAIL]");
        assertThat(result.totalElements()).isEqualTo(1L);
        assertThat(result.page()).isEqualTo(0);
        assertThat(result.totalPages()).isEqualTo(1);
    }

    @Test
    void filteredEntries_returnsDetachedCopies() {
        SocLedgerEntry original = socEntry(UUID.randomUUID(), SocStepType.ALERT_TRIAGE,
                                           Instant.parse("2026-01-01T10:00:00Z"), "{\"alertSeverity\":\"HIGH\"}", 1);
        repo.filteredEntries = List.of(original);
        repo.filteredCount   = 1;

        PagedAuditEntries result = service.filteredEntries(
                Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-02T00:00:00Z"),
                null, null, null, 0, 50, "tenant-1");

        assertThat(result.content().getFirst()).isNotSameAs(original);
    }

    @Test
    void complianceSummary_doraP1_metWhenAllWithinSla() {
        UUID    incidentId = UUID.randomUUID();
        Instant base       = Instant.parse("2026-01-01T10:00:00Z");
        repo.timeRangeEntries = List.of(
                socEntry(incidentId, SocStepType.ALERT_TRIAGE, base,
                         "{\"assignedSeverity\":\"CRITICAL\"}", 1),
                socEntry(incidentId, SocStepType.INCIDENT_RESOLVED, base.plus(Duration.ofMinutes(10)),
                         "{\"resolutionOutcome\":\"RESOLVED\"}", 2)
                                       );

        var reqs = service.complianceSummary(
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-02T00:00:00Z"), "tenant-1");

        var doraP1 = reqs.stream()
                         .filter(r -> r.regulation().equals("DORA") && r.requirement().contains("P1"))
                         .findFirst().orElseThrow();
        assertThat(doraP1.status()).isEqualTo("MET");
    }

    @Test
    void complianceSummary_soc2ContainmentAuth_breachedWhenMissing() {
        UUID    incidentId = UUID.randomUUID();
        Instant base       = Instant.parse("2026-01-01T10:00:00Z");
        var     entries    = new ArrayList<SocLedgerEntry>();
        for (int i = 0; i < 3; i++) {
            entries.add(socEntry(incidentId, SocStepType.CONTAINMENT_DECISION,
                                 base.plusSeconds(i),
                                 "{\"approverId\":\"admin\",\"riskClassification\":\"HIGH\",\"containmentAction\":\"block\"}", i + 1));
        }
        for (int i = 0; i < 2; i++) {
            entries.add(socEntry(incidentId, SocStepType.CONTAINMENT_DECISION,
                                 base.plusSeconds(60 + i),
                                 "{\"riskClassification\":\"HIGH\",\"containmentAction\":\"block\"}", i + 4));
        }
        repo.timeRangeEntries = entries;

        var reqs = service.complianceSummary(
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-02T00:00:00Z"), "tenant-1");

        var soc2Auth = reqs.stream()
                           .filter(r -> r.regulation().equals("SOC2") && r.requirement().contains("authorisation"))
                           .findFirst().orElseThrow();
        assertThat(soc2Auth.status()).isEqualTo("BREACHED");
    }


    private SocLedgerEntry socEntry(UUID incidentId, SocStepType type,
            Instant occurredAt, String metadata, int seq) {
        SocLedgerEntry e = new SocLedgerEntry();
        e.incidentId = incidentId;
        e.subjectId = incidentId;
        e.stepType = type;
        e.occurredAt = occurredAt;
        e.metadata = metadata;
        e.sequenceNumber = seq;
        e.tenancyId = "tenant-1";
        return e;
    }

    static class StubSocRepo extends SocLedgerEntryRepository {
        List<SocLedgerEntry> timeRangeEntries = List.of();
        List<SocLedgerEntry> incidentEntries = List.of();

        @Override
        public List<SocLedgerEntry> findByTimeRange(Instant from, Instant to, String tenancyId) {
            return new ArrayList<>(timeRangeEntries);
        }

        @Override
        public List<SocLedgerEntry> findByIncidentId(UUID incidentId, String tenancyId) {
            return new ArrayList<>(incidentEntries);
        }

        List<SocLedgerEntry> filteredEntries = List.of();
        long                 filteredCount   = 0;
        List<String>         actors          = List.of();

        @Override
        public List<SocLedgerEntry> findFiltered(java.time.Instant from, java.time.Instant to,
                                                 io.casehub.soc.domain.SocStepType stepType, String actorId, java.util.UUID incidentId,
                                                 int page, int size, String tenancyId) {
            return new ArrayList<>(filteredEntries);
        }

        @Override
        public long countFiltered(java.time.Instant from, java.time.Instant to,
                                  io.casehub.soc.domain.SocStepType stepType, String actorId, java.util.UUID incidentId,
                                  String tenancyId) {
            return filteredCount;
        }

        @Override
        public List<String> findDistinctActors(java.time.Instant from, java.time.Instant to, String tenancyId) {
            return new ArrayList<>(actors);
        }
    }
}
