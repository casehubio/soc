package io.casehub.soc.rest.dto;

import java.util.Map;

public record RoutingPolicyResponse(double threshold, double borderlineMargin,
    double blendFactor, int minimumObservations,
    Map<String, Double> qualityFloors, double cbrWeight,
    boolean bootstrapEscalationRequired) {}
