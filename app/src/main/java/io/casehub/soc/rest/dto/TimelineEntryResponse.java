package io.casehub.soc.rest.dto;

import java.time.Instant;

public record TimelineEntryResponse(String action, String actor,
    Instant timestamp, String detail) {}
