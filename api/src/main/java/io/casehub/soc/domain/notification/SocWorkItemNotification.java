package io.casehub.soc.domain.notification;

import io.casehub.platform.api.subscription.SubscribableEvent;

import java.time.Instant;
import java.util.Objects;

public record SocWorkItemNotification(
    String eventType,
    String tenancyId,
    String workItemId,
    String caseId,
    String title,
    String assigneeId,
    String candidateGroups,
    String actorId,
    Instant occurredAt
) implements SubscribableEvent {

    public SocWorkItemNotification {
        Objects.requireNonNull(eventType, "eventType");
        Objects.requireNonNull(tenancyId, "tenancyId");
        Objects.requireNonNull(workItemId, "workItemId");
        Objects.requireNonNull(actorId, "actorId");
        Objects.requireNonNull(occurredAt, "occurredAt");
    }

    @Override
    public String type() { return eventType; }
}
