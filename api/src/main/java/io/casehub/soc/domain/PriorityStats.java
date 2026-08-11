package io.casehub.soc.domain;

import java.time.Duration;

public record PriorityStats(
    int count,
    Duration avgTimeToTriage,
    Duration avgTimeToContainment,
    Duration avgTimeToResolution,
    double slaCompliancePercent) {}
