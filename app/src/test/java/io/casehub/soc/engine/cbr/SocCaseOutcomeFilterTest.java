package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.soc.domain.SocCaseTypes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocCaseOutcomeFilterTest {

    @ParameterizedTest
    @ValueSource(strings = {"resolved", "escalated", "false-positive"})
    void successOutcomes_accepted(String outcomeLabel) {
        var event = event(SocCaseTypes.INCIDENT_INVESTIGATION, outcomeLabel);
        assertThat(SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)).isTrue();
    }

    @Test
    void faultedOutcome_rejected() {
        var event = event(SocCaseTypes.INCIDENT_INVESTIGATION, "FAULTED");
        assertThat(SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)).isFalse();
    }

    @Test
    void cancelledOutcome_rejected() {
        var event = event(SocCaseTypes.INCIDENT_INVESTIGATION, "CANCELLED");
        assertThat(SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)).isFalse();
    }

    @Test
    void nonSocCaseType_rejected() {
        var event = event("aml-investigation", "resolved");
        assertThat(SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)).isFalse();
    }

    private static CaseOutcomeEvent event(String caseType, String outcomeLabel) {
        return new CaseOutcomeEvent(caseType, "tenant-1", UUID.randomUUID(),
            Map.of(), outcomeLabel, Instant.now(), Map.of());
    }
}
