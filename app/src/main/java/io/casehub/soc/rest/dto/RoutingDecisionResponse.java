package io.casehub.soc.rest.dto;

import java.util.List;

public record RoutingDecisionResponse(String capabilityTag, String strategyId,
    RoutingCandidateResponse selected,
    List<RoutingCandidateResponse> alternatives,
    RoutingPolicyResponse policy) {}
