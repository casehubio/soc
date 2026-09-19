package io.casehub.soc.rest.dto;

import java.time.Instant;
import java.util.UUID;

public record IncidentSummaryResponse(
        UUID id,
        String status,
        String severity,
        String source,
        String title,
        Instant createdAt) {}
