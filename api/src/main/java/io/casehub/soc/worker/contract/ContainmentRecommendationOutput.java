package io.casehub.soc.worker.contract;

import java.util.Map;

public record ContainmentRecommendationOutput(
        String recommendedAction,
        double riskScore,
        double confidenceScore,
        String rationale,
        Map<String, Object> actionParameters) {}
