package io.casehub.soc.rest.dto;

import java.time.Instant;
import java.util.List;

public record IocResponse(String type, String value, double confidence,
    String source, Instant firstSeen, List<String> tags) {}
