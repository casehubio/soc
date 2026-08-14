package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.soc.domain.SocCaseTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

final class TestCaseOutcomeEvents {
    private TestCaseOutcomeEvents() {}

    static CaseOutcomeEvent resolved(String tenantId) {
        return new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION,
            tenantId, UUID.randomUUID(), Map.of(), "resolved",
            Instant.parse("2026-08-11T12:00:00Z"), Map.of());
    }

    static CaseOutcomeEvent resolved(String tenantId, UUID caseId, Map<String, Object> snapshot) {
        return new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION,
            tenantId, caseId, snapshot, "resolved",
            Instant.parse("2026-08-11T12:00:00Z"), Map.of());
    }
}
