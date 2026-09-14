package io.casehub.soc.engine.spi;

import java.time.Instant;
import java.util.Map;

public record ContainmentResponse(
    boolean success,
    String details,
    String errorReason,
    boolean retryable,
    Map<String, Object> metadata
) {
    public ContainmentResult toResult() {
        if (success) {
            return ContainmentResult.success(details, Instant.now());
        }
        return ContainmentResult.failure(errorReason, retryable);
    }
}
