package io.casehub.soc.engine.spi;

import java.time.Instant;

public record ContainmentResult(
    boolean success,
    Instant timestamp,
    String details,
    String errorReason,
    boolean retryable
) {
    public static ContainmentResult success(String details, Instant timestamp) {
        return new ContainmentResult(true, timestamp, details, null, false);
    }

    public static ContainmentResult failure(String errorReason, boolean retryable) {
        return new ContainmentResult(false, Instant.now(), null, errorReason, retryable);
    }
}
