package io.casehub.soc.rest.dto;

import java.util.List;

public record CbrSimilarResponse(CbrSummaryResponse summary,
    List<CbrPrecedentResponse> incidents) {}
