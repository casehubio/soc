package io.casehub.soc.domain;

import java.time.Instant;
import java.util.Map;

public record DoraResponseTimeReport(
    Instant reportPeriodStart,
    Instant reportPeriodEnd,
    int totalIncidents,
    Map<String, PriorityStats> byPriority) {}
