package io.casehub.soc.rest.dto;

import java.util.Map;

public record RoutingCandidateResponse(String workerId, Double trustScore,
    double workloadScore, String phase, long observations,
    double finalScore, String exclusionReason, String rationale,
    Map<String, Double> additionalScores) {}
