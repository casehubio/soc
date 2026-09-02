package io.casehub.soc.engine.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocContainmentLedgerObserverTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private RecordingLedgerWriter writer;
    private SocContainmentLedgerObserver observer;

    @BeforeEach
    void setUp() {
        writer = new RecordingLedgerWriter();
        observer = new SocContainmentLedgerObserver(writer, new SocPiiSanitiser());
    }

    @Test
    void writesGateDecisionEntry_autonomous() {
        ObjectNode ctx = mapper.createObjectNode();
        ctx.putObject("containmentRecommendation")
                .put("recommendedAction", "BLOCK_IP")
                .put("riskScore", 0.3)
                .put("confidenceScore", 0.95);
        ctx.put("containmentGateDecision", "autonomous");

        fire(ctx);

        assertThat(writer.entries).hasSize(1);
        assertThat(writer.entries.get(0).stepType).isEqualTo(SocStepType.CONTAINMENT_GATE_DECISION);
        assertThat(writer.entries.get(0).metadata).contains("\"gateDecision\":\"autonomous\"");
    }

    @Test
    void writesApprovalEntry_whenGateApproved() {
        ObjectNode ctx = mapper.createObjectNode();
        ctx.putObject("containmentRecommendation")
                .put("recommendedAction", "ISOLATE_HOST");
        ctx.put("containmentGateDecision", "gated");
        ctx.putObject("actionGateApproved")
                .put("actionType", "isolate.host")
                .put("approvedBy", "analyst-jane")
                .put("resolution", "confirmed threat");

        fire(ctx);

        assertThat(writer.entries).anyMatch(e ->
                e.stepType == SocStepType.CONTAINMENT_GATE_DECISION);
        assertThat(writer.entries).anyMatch(e ->
                e.stepType == SocStepType.CONTAINMENT_APPROVAL &&
                e.metadata.contains("analyst-jane"));
    }

    @Test
    void writesRejectionEntry_whenGateRejected() {
        ObjectNode ctx = mapper.createObjectNode();
        ctx.putObject("containmentRecommendation")
                .put("recommendedAction", "ISOLATE_HOST");
        ctx.put("containmentGateDecision", "gated");
        ctx.putObject("actionGateRejected")
                .put("actionType", "isolate.host")
                .put("rejectedBy", "analyst-bob")
                .put("reason", "false positive");

        fire(ctx);

        assertThat(writer.entries).anyMatch(e ->
                e.stepType == SocStepType.CONTAINMENT_REJECTION &&
                e.metadata.contains("analyst-bob"));
    }

    @Test
    void writesExecutionEntry() {
        ObjectNode ctx = mapper.createObjectNode();
        ctx.putObject("containmentExecution")
                .put("actionType", "isolate.host")
                .put("executed", true)
                .put("success", true)
                .put("executionTimestamp", "2026-09-02T10:15:03Z")
                .put("detectionToContainmentMs", 45003);

        fire(ctx);

        assertThat(writer.entries).anyMatch(e ->
                e.stepType == SocStepType.CONTAINMENT_EXECUTED &&
                e.metadata.contains("\"executionResult\":\"SUCCESS\""));
    }

    @Test
    void deduplicates_sameSignalFiredTwice() {
        ObjectNode ctx = mapper.createObjectNode();
        ctx.put("containmentGateDecision", "autonomous");
        ctx.putObject("containmentRecommendation")
                .put("recommendedAction", "BLOCK_IP")
                .put("riskScore", 0.3)
                .put("confidenceScore", 0.9);

        UUID caseId = UUID.randomUUID();
        var event = makeEvent(caseId, ctx);
        observer.onLifecycle(event);
        observer.onLifecycle(event);

        assertThat(writer.entries).hasSize(1);
    }

    private void fire(ObjectNode contextSnapshot) {
        UUID caseId = UUID.randomUUID();
        observer.onLifecycle(makeEvent(caseId, contextSnapshot));
    }

    private CaseLifecycleEvent makeEvent(UUID caseId, ObjectNode contextSnapshot) {
        return new CaseLifecycleEvent(
                caseId, "test-tenant", "ContextChanged", "ContextChanged",
                "ACTIVE", "system:soc", "containment", null,
                "incident-investigation", "io.casehub.soc",
                contextSnapshot, null, null);
    }

    static class RecordingLedgerWriter extends SocLedgerEntryWriter {
        final List<Entry> entries = new ArrayList<>();

        RecordingLedgerWriter() { super(null, null); }

        @Override
        public void write(UUID incidentId, SocStepType stepType, String actorId,
                          String actorRole, ActorType actorType,
                          String metadata, String tenancyId, UUID causedByEntryId) {
            entries.add(new Entry(incidentId, stepType, actorId, metadata, causedByEntryId));
        }

        record Entry(UUID incidentId, SocStepType stepType, String actorId,
                     String metadata, UUID causedByEntryId) {}
    }
}
