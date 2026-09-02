package io.casehub.soc.worker.contract;

import java.time.Instant;

public record ContainmentExecutionOutput(
    String actionType,
    boolean executed,
    boolean success,
    String details,
    String errorReason,
    Instant executionTimestamp,
    long detectionToContainmentMs
) {}
