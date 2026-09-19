package io.casehub.soc.rest.dto;

import java.time.Instant;
import java.util.List;

public record AgentTrustResponse(String agentId, String name,
    String capability, String agentType, double globalTrustScore,
    long decisionCount, Instant lastComputedAt,
    List<TrustDimensionResponse> dimensions) {}
