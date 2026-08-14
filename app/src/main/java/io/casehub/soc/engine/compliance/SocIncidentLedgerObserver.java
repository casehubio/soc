package io.casehub.soc.engine.compliance;

import com.fasterxml.jackson.databind.JsonNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocIncidentStatus;
import io.casehub.soc.domain.SocStepType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class SocIncidentLedgerObserver {

    private static final Logger LOG = Logger.getLogger(SocIncidentLedgerObserver.class);
    private final ConcurrentHashMap<UUID, String> lastStatusByCase = new ConcurrentHashMap<>();
    private final SocLedgerEntryWriter writer;

    @Inject
    SocIncidentLedgerObserver(SocLedgerEntryWriter writer) {
        this.writer = writer;
    }

    void onLifecycle(@ObservesAsync CaseLifecycleEvent event) {
        if (!SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseDefinitionName())) return;
        if (event.contextSnapshot() == null) return;

        String statusText = event.contextSnapshot().path("incidentStatus").asText(null);
        if (statusText == null) return;

        String previous = lastStatusByCase.get(event.caseId());
        if (statusText.equals(previous)) return;
        lastStatusByCase.put(event.caseId(), statusText);

        try {
            SocIncidentStatus s = SocIncidentStatus.valueOf(statusText);
            if (s.isTerminal()) lastStatusByCase.remove(event.caseId());
        } catch (IllegalArgumentException ignored) {}

        SocStepType stepType = mapStatusToStepType(statusText);
        if (stepType == null) return;

        String metadata = buildMetadata(stepType, event.contextSnapshot());
        String actorId = event.actorId() != null ? event.actorId() : "system:soc";

        try {
            writer.write(event.caseId(), stepType, actorId, "incident-lifecycle",
                    ActorType.SYSTEM, metadata, event.tenancyId(), null);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to write ledger entry stepType=%s caseId=%s", stepType, event.caseId());
        }
    }

    private SocStepType mapStatusToStepType(String status) {
        try {
            SocIncidentStatus s = SocIncidentStatus.valueOf(status);
            return switch (s) {
                case TRIAGING -> SocStepType.ALERT_TRIAGE;
                case INVESTIGATING -> SocStepType.INCIDENT_PROMOTED;
                default -> null;
            };
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String buildMetadata(SocStepType stepType, JsonNode context) {
        return switch (stepType) {
            case ALERT_TRIAGE -> {
                String severity = context.path("alert").path("severity").asText("UNKNOWN");
                yield "{\"alertSeverity\":\"" + sanitise(severity) +
                      "\",\"assignedSeverity\":\"" + sanitise(severity) +
                      "\",\"triageAgentId\":\"system:soc-triage\"}";
            }
            case INCIDENT_PROMOTED ->
                "{\"promotionReason\":\"threat-confirmed-by-investigation\"}";
            default -> "{}";
        };
    }

    private static String sanitise(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
