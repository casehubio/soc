package io.casehub.soc.rest.dto;

import java.util.Map;

public record CbrSummaryResponse(int totalSimilar,
    Map<String, Integer> outcomes, long avgResolutionMinutes,
    String dominantOutcome, int dominantOutcomePercent) {}
