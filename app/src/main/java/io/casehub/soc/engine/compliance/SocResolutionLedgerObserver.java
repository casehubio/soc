package io.casehub.soc.engine.compliance;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.api.spi.CaseOutcomeObserver;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocStepType;
import io.casehub.soc.engine.cbr.SocCaseOutcomeFilter;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Map;

@ApplicationScoped
public class SocResolutionLedgerObserver implements CaseOutcomeObserver {

    private final SocLedgerEntryWriter writer;

    @Inject
    SocResolutionLedgerObserver(SocLedgerEntryWriter writer) {
        this.writer = writer;
    }

    @Override
    public void onOutcome(CaseOutcomeEvent event) {
        if (!SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)) {
            return;
        }

        Map<String, Object> snapshot = event.caseFileSnapshot();
        String outcome = snapshot.getOrDefault("analystOutcome", event.outcomeLabel()).toString();
        String analystId = snapshot.getOrDefault("analystId", "system:soc-compliance").toString();
        ActorType actorType = "system:soc-compliance".equals(analystId) ? ActorType.SYSTEM : ActorType.HUMAN;

        String metadataJson = "{\"resolutionOutcome\":\"" + sanitiseJsonValue(outcome) + "\"}";

        writer.write(event.caseId(), SocStepType.INCIDENT_RESOLVED,
                analystId, "incident-resolution", actorType,
                metadataJson, event.tenancyId(), null);
    }

    private static String sanitiseJsonValue(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
