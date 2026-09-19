package io.casehub.soc.rest.dto;

public record TrustDimensionResponse(String key, double score,
    long decisionCount) {}
