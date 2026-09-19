package io.casehub.soc.rest.dto;

public record AlertInjectionRequest(String eventType, String severity,
    String source, String rule, String correlationKey) {}
