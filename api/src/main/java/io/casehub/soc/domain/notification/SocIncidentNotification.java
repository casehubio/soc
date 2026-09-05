package io.casehub.soc.domain.notification;

import io.casehub.platform.api.subscription.SubscribableEvent;

import java.time.Instant;
import java.util.Objects;

public record SocIncidentNotification(
    String eventType,
    String tenancyId,
    String caseId,
    String severity,
    String tactic,
    String correlationKey,
    String actorId,
    String assignedAnalystId,
    Instant occurredAt
) implements SubscribableEvent {

    public SocIncidentNotification {
        Objects.requireNonNull(eventType, "eventType");
        Objects.requireNonNull(tenancyId, "tenancyId");
        Objects.requireNonNull(caseId, "caseId");
        Objects.requireNonNull(actorId, "actorId");
        Objects.requireNonNull(occurredAt, "occurredAt");
    }

    @Override
    public String type() { return eventType; }
}
