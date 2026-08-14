package io.casehub.soc.engine.compliance;

import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocLedgerEntryTest {

    @Test
    void domainContentBytes_includesIncidentIdAndStepType() {
        var entry = new SocLedgerEntry();
        entry.incidentId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        entry.stepType = SocStepType.ALERT_TRIAGE;

        String result = new String(entry.domainContentBytes(), StandardCharsets.UTF_8);
        assertThat(result).isEqualTo("11111111-1111-1111-1111-111111111111|ALERT_TRIAGE");
    }

    @Test
    void domainContentBytes_nullsSafelyHandled() {
        var entry = new SocLedgerEntry();
        String result = new String(entry.domainContentBytes(), StandardCharsets.UTF_8);
        assertThat(result).isEqualTo("|");
    }

    @Test
    void prePersist_throwsWhenIncidentIdDoesNotMatchSubjectId() {
        var entry = new SocLedgerEntry();
        entry.incidentId = UUID.randomUUID();
        entry.subjectId = UUID.randomUUID();
        assertThatThrownBy(entry::validateIncidentIdInvariant)
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void prePersist_succeedsWhenIncidentIdMatchesSubjectId() {
        var entry = new SocLedgerEntry();
        UUID id = UUID.randomUUID();
        entry.incidentId = id;
        entry.subjectId = id;
        entry.validateIncidentIdInvariant();
    }
}
