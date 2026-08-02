package io.casehub.soc.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.casehub.api.model.CaseStatus;
import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.work.api.Outcome;
import io.casehub.work.api.WorkItemCreateRequest;
import io.casehub.work.api.WorkItemPriority;
import io.casehub.work.api.WorkItemRef;
import io.casehub.work.api.WorkItemStatus;
import io.casehub.work.api.spi.WorkItemCreator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocFaultedCaseReviewCreatorTest {

    private StubWorkItemCreator workItemCreator;
    private SocFaultedCaseReviewCreator creator;

    @BeforeEach
    void setUp() {
        workItemCreator = new StubWorkItemCreator();
        creator = new SocFaultedCaseReviewCreator(workItemCreator, new ObjectMapper());
    }

    // ── Filtering ──────────────────────────────────────────────────────

    @Test
    void completedIncidentInvestigation_noWorkItemCreated() {
        creator.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.COMPLETED.name()));
        assertThat(workItemCreator.created).isEmpty();
    }

    @Test
    void cancelledIncidentInvestigation_noWorkItemCreated() {
        creator.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.CANCELLED.name()));
        assertThat(workItemCreator.created).isEmpty();
    }

    @Test
    void faultedNonSocCase_noWorkItemCreated() {
        creator.onOutcome(event("aml-investigation", CaseStatus.FAULTED.name()));
        assertThat(workItemCreator.created).isEmpty();
    }

    // ── Happy path ─────────────────────────────────────────────────────

    @Test
    void faultedIncidentInvestigation_createsWorkItem() {
        final UUID caseId = UUID.randomUUID();
        final var snapshot = Map.<String, Object>of(
                "alert", Map.of("severity", "CRITICAL", "source", "crowdstrike"));

        creator.processOutcome(event(
                SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.FAULTED.name(),
                caseId, "tenant-1", snapshot));

        assertThat(workItemCreator.created).hasSize(1);
        final WorkItemCreateRequest req = workItemCreator.created.getFirst();
        assertThat(req.callerRef).isEqualTo("case-faulted:" + caseId);
        assertThat(req.createdBy).isEqualTo("system:soc-failure-review");
        assertThat(req.tenancyId).isEqualTo("tenant-1");
        assertThat(req.priority).isEqualTo(WorkItemPriority.URGENT);
        assertThat(req.candidateGroups).isEqualTo("soc-tier2-analyst");
        assertThat(req.title).contains("CRITICAL");
    }

    @Test
    void faultedIncidentInvestigation_duplicateCall_noSecondWorkItem() {
        final UUID caseId = UUID.randomUUID();
        final var snapshot = Map.<String, Object>of(
                "alert", Map.of("severity", "HIGH", "source", "sentinel"));

        creator.processOutcome(event(
                SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.FAULTED.name(),
                caseId, "tenant-1", snapshot));

        assertThat(workItemCreator.created).hasSize(1);

        workItemCreator.activeByCallerRef = Optional.of(new WorkItemRef(
                UUID.randomUUID(), WorkItemStatus.PENDING, "case-faulted:" + caseId,
                null, null, "soc-tier2-analyst", null, "tenant-1", null, null, null));

        creator.processOutcome(event(
                SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.FAULTED.name(),
                caseId, "tenant-1", snapshot));

        assertThat(workItemCreator.created).hasSize(1);
    }

    @Test
    void priorityDerivation_critical_mapsToUrgent() {
        creator.processOutcome(faultedEvent(Map.of("alert", Map.of("severity", "CRITICAL"))));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.URGENT);
    }

    @Test
    void priorityDerivation_high_mapsToHigh() {
        creator.processOutcome(faultedEvent(Map.of("alert", Map.of("severity", "HIGH"))));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.HIGH);
    }

    @Test
    void priorityDerivation_medium_mapsToMedium() {
        creator.processOutcome(faultedEvent(Map.of("alert", Map.of("severity", "MEDIUM"))));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.MEDIUM);
    }

    @Test
    void priorityDerivation_low_mapsToLow() {
        creator.processOutcome(faultedEvent(Map.of("alert", Map.of("severity", "LOW"))));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.LOW);
    }

    @Test
    void priorityDerivation_missingSeverity_defaultsToHigh() {
        creator.processOutcome(faultedEvent(Map.of("alert", Map.of("source", "crowdstrike"))));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.HIGH);
    }

    @Test
    void priorityDerivation_missingAlert_defaultsToHigh() {
        creator.processOutcome(faultedEvent(Map.of()));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.HIGH);
    }

    @Test
    void payloadContainsCaseContextAsJson() {
        final var snapshot = Map.<String, Object>of(
                "alert", Map.of("severity", "HIGH"),
                "iocEnrichment", Map.of("iocs", List.of()));
        creator.processOutcome(faultedEvent(snapshot));

        final String payload = workItemCreator.created.getFirst().payload;
        assertThat(payload).contains("\"alert\"");
        assertThat(payload).contains("\"iocEnrichment\"");
    }

    @Test
    void permittedOutcomes_containsAcknowledgedAndEscalated() {
        creator.processOutcome(faultedEvent(Map.of()));

        final List<Outcome> outcomes = workItemCreator.created.getFirst().permittedOutcomes;
        assertThat(outcomes).extracting(Outcome::name)
                            .containsExactlyInAnyOrder("acknowledged", "escalated");
    }
// ── Edge cases ─────────────────────────────────────────────────────

    @Test
    void emptyContextSnapshot_workItemStillCreated() {
        creator.processOutcome(faultedEvent(Map.of()));

        assertThat(workItemCreator.created).hasSize(1);
        assertThat(workItemCreator.created.getFirst().payload).isEqualTo("{}");
    }

    @Test
    void titleWithSourceAndSeverity_includesBoth() {
        creator.processOutcome(faultedEvent(Map.of(
                "alert", Map.of("severity", "HIGH", "source", "sentinel"))));

        assertThat(workItemCreator.created.getFirst().title)
                .isEqualTo("Failed investigation: HIGH alert from sentinel");
    }

    @Test
    void titleWithoutAlert_usesDefaultFormat() {
        creator.processOutcome(faultedEvent(Map.of()));

        assertThat(workItemCreator.created.getFirst().title)
                .isEqualTo("Failed investigation: HIGH priority — review required");
    }

    @Test
    void priorityDerivation_unknownSeverity_defaultsToHigh() {
        creator.processOutcome(faultedEvent(Map.of("alert", Map.of("severity", "UNKNOWN"))));
        assertThat(workItemCreator.created.getFirst().priority).isEqualTo(WorkItemPriority.HIGH);
    }

    @Test
    void tenancyIdPropagated() {
        creator.processOutcome(event(
                SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.FAULTED.name(),
                UUID.randomUUID(), "tenant-acme", Map.of()));

        assertThat(workItemCreator.created.getFirst().tenancyId).isEqualTo("tenant-acme");
    }

    @Test
    void candidateGroupsSetToSocTier2Analyst() {
        creator.processOutcome(faultedEvent(Map.of()));
        assertThat(workItemCreator.created.getFirst().candidateGroups).isEqualTo("soc-tier2-analyst");
    }

    @Test
    void createdBySetToSystemSocFailureReview() {
        creator.processOutcome(faultedEvent(Map.of()));
        assertThat(workItemCreator.created.getFirst().createdBy).isEqualTo("system:soc-failure-review");
    }


    // ── Helpers ─────────────────────────────────────────────────────────

    private static CaseOutcomeEvent event(final String caseType, final String outcomeLabel) {
        return event(caseType, outcomeLabel, UUID.randomUUID(), "tenant-1", Map.of());
    }

    private static CaseOutcomeEvent event(
            final String caseType,
            final String outcomeLabel,
            final UUID caseId,
            final String tenancyId,
            final Map<String, Object> snapshot) {
        return new CaseOutcomeEvent(caseType, tenancyId, caseId, snapshot, outcomeLabel, Instant.now(), Map.of());
    }

    private static CaseOutcomeEvent faultedEvent(final Map<String, Object> snapshot) {
        return event(SocCaseTypes.INCIDENT_INVESTIGATION, CaseStatus.FAULTED.name(),
                     UUID.randomUUID(), "tenant-1", snapshot);
    }


    static class StubWorkItemCreator implements WorkItemCreator {
        final List<WorkItemCreateRequest> created = new ArrayList<>();
        Optional<WorkItemRef> activeByCallerRef = Optional.empty();

        @Override
        public WorkItemRef create(final WorkItemCreateRequest request) {
            created.add(request);
            return new WorkItemRef(
                    UUID.randomUUID(), WorkItemStatus.PENDING, request.callerRef,
                    null, null, request.candidateGroups, null, request.tenancyId,
                    request.payload, null, null);
        }

        @Override
        public Optional<WorkItemRef> findByCallerRef(final String callerRef) {
            return Optional.empty();
        }

        @Override
        public Optional<WorkItemRef> findActiveByCallerRef(final String callerRef) {
            return activeByCallerRef;
        }

        @Override
        public void obsoleteByCallerRef(final String callerRef) {}
    }
}
