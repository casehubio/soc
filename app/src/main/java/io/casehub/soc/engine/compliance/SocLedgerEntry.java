package io.casehub.soc.engine.compliance;

import io.casehub.ledger.runtime.model.jpa.JpaLedgerEntry;
import io.casehub.soc.domain.SocStepType;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Entity
@Table(name = "soc_ledger_entry")
@DiscriminatorValue("SOC")
public class SocLedgerEntry extends JpaLedgerEntry {

    @Column(name = "incident_id", nullable = false)
    public UUID incidentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "step_type", nullable = false, length = 30)
    public SocStepType stepType;

    @Override
    protected byte[] domainContentBytes() {
        return String.join("|",
                incidentId != null ? incidentId.toString() : "",
                stepType != null ? stepType.name() : "")
            .getBytes(StandardCharsets.UTF_8);
    }

    @PrePersist
    void validateIncidentIdInvariant() {
        if (incidentId != null && subjectId != null && !incidentId.equals(subjectId)) {
            throw new IllegalStateException(
                "incidentId must equal subjectId: incidentId=" + incidentId + " subjectId=" + subjectId);
        }
    }
}
