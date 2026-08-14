package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.soc.domain.SocCaseTypes;

import java.util.Set;

public final class SocCaseOutcomeFilter {

    private static final Set<String> SUCCESS_OUTCOMES = Set.of("resolved", "escalated", "false-positive");

    private SocCaseOutcomeFilter() {}

    public static boolean isSuccessfulIncidentInvestigation(CaseOutcomeEvent event) {
        return SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseType())
            && SUCCESS_OUTCOMES.contains(event.outcomeLabel());
    }
}
