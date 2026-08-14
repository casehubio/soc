package io.casehub.soc.domain;

import java.time.Instant;
import java.util.UUID;

public record SocIncidentStatusChangedEvent(
    UUID caseId,
    String tenancyId,
    String previousStatus,
    String newStatus,
    Instant occurredAt) {}
