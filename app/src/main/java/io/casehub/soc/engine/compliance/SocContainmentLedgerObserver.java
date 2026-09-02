package io.casehub.soc.engine.compliance;

import com.fasterxml.jackson.databind.JsonNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocStepType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class SocContainmentLedgerObserver {

    private static final Logger LOG = Logger.getLogger(SocContainmentLedgerObserver.class);
    private static final String CASE_DEF_NAME = "incident-investigation";
    private final Set<String> processedSignals = ConcurrentHashMap.newKeySet();
    private final SocLedgerEntryWriter writer;
    private final SocPiiSanitiser sanitiser;

    @Inject
    SocContainmentLedgerObserver(SocLedgerEntryWriter writer, SocPiiSanitiser sanitiser) {
        this.writer = writer;
        this.sanitiser = sanitiser;
    }

    void onLifecycle(@ObservesAsync CaseLifecycleEvent event) {
        if (!CASE_DEF_NAME.equals(event.caseDefinitionName())) return;
        if (event.contextSnapshot() == null) return;

        JsonNode ctx = event.contextSnapshot();
        UUID caseId = event.caseId();
        String tenancyId = event.tenancyId();

        writeGateDecisionIfPresent(caseId, ctx, tenancyId);
        writeApprovalOrRejectionIfPresent(caseId, ctx, tenancyId);
        writeExecutionIfPresent(caseId, ctx, tenancyId);
    }

    private void writeGateDecisionIfPresent(UUID caseId, JsonNode ctx, String tenancyId) {
        String gateDecision = ctx.path("containmentGateDecision").asText(null);
        if (gateDecision == null) return;

        String key = caseId + ":gate";
        if (!processedSignals.add(key)) return;

        JsonNode rec = ctx.path("containmentRecommendation");
        String actionType = sanitiser.sanitise(rec.path("recommendedAction").asText("UNKNOWN"));
        double riskScore = rec.path("riskScore").asDouble(0.0);
        double confidenceScore = rec.path("confidenceScore").asDouble(0.0);

        String metadata = String.format(
                "{\"actionType\":\"%s\",\"riskScore\":\"%.2f\",\"confidenceScore\":\"%.2f\",\"gateDecision\":\"%s\"}",
                actionType, riskScore, confidenceScore, sanitiser.sanitise(gateDecision));

        try {
            writer.write(caseId, SocStepType.CONTAINMENT_GATE_DECISION,
                    "system:soc", "containment-gate", ActorType.SYSTEM,
                    metadata, tenancyId, null);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to write CONTAINMENT_GATE_DECISION ledger entry caseId=%s", caseId);
        }
    }

    private void writeApprovalOrRejectionIfPresent(UUID caseId, JsonNode ctx, String tenancyId) {
        JsonNode approved = ctx.path("actionGateApproved");
        JsonNode rejected = ctx.path("actionGateRejected");

        if (!approved.isMissingNode() && approved.isObject()) {
            String key = caseId + ":approval";
            if (!processedSignals.add(key)) return;

            String actionType = sanitiser.sanitise(approved.path("actionType").asText("UNKNOWN"));
            String approverId = sanitiser.sanitise(approved.path("approvedBy").asText("unknown"));
            String resolution = sanitiser.sanitise(approved.path("resolution").asText(""));

            String metadata = String.format(
                    "{\"actionType\":\"%s\",\"approverId\":\"%s\",\"resolution\":\"%s\"}",
                    actionType, approverId, resolution);

            try {
                writer.write(caseId, SocStepType.CONTAINMENT_APPROVAL,
                        approverId, "containment-approval", ActorType.HUMAN,
                        metadata, tenancyId, null);
            } catch (Exception e) {
                LOG.errorf(e, "Failed to write CONTAINMENT_APPROVAL ledger entry caseId=%s", caseId);
            }
        } else if (!rejected.isMissingNode() && rejected.isObject()) {
            String key = caseId + ":rejection";
            if (!processedSignals.add(key)) return;

            String actionType = sanitiser.sanitise(rejected.path("actionType").asText("UNKNOWN"));
            String rejectorId = sanitiser.sanitise(rejected.path("rejectedBy").asText("unknown"));
            String reason = sanitiser.sanitise(rejected.path("reason").asText(""));

            String metadata = String.format(
                    "{\"actionType\":\"%s\",\"rejectorId\":\"%s\",\"rejectionReason\":\"%s\"}",
                    actionType, rejectorId, reason);

            try {
                writer.write(caseId, SocStepType.CONTAINMENT_REJECTION,
                        rejectorId, "containment-rejection", ActorType.HUMAN,
                        metadata, tenancyId, null);
            } catch (Exception e) {
                LOG.errorf(e, "Failed to write CONTAINMENT_REJECTION ledger entry caseId=%s", caseId);
            }
        }
    }

    private void writeExecutionIfPresent(UUID caseId, JsonNode ctx, String tenancyId) {
        JsonNode exec = ctx.path("containmentExecution");
        if (exec.isMissingNode() || !exec.isObject()) return;

        String key = caseId + ":execution";
        if (!processedSignals.add(key)) return;

        String actionType = sanitiser.sanitise(exec.path("actionType").asText("UNKNOWN"));
        boolean success = exec.path("success").asBoolean(false);
        long dtoC = exec.path("detectionToContainmentMs").asLong(0);

        String metadata = String.format(
                "{\"executionResult\":\"%s\",\"containmentAction\":\"%s\",\"detectionToContainmentMs\":%d}",
                success ? "SUCCESS" : "FAILURE", actionType, dtoC);

        try {
            writer.write(caseId, SocStepType.CONTAINMENT_EXECUTED,
                    "system:soc", "containment-execution", ActorType.SYSTEM,
                    metadata, tenancyId, null);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to write CONTAINMENT_EXECUTED ledger entry caseId=%s", caseId);
        }
    }
}
