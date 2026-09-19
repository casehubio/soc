package io.casehub.soc.rest.dto;

public record AlertInjectionResponse(String situationId, String eventId,
    String correlationKey, boolean evaluated) {}
