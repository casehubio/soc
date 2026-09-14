package io.casehub.soc.connector.identity;

import java.util.Map;

public record IdentityResult(boolean success, String details, String errorReason,
                               boolean retryable, Map<String, Object> metadata) {

    public static IdentityResult success(String details, Map<String, Object> metadata) {
        return new IdentityResult(true, details, null, false, metadata);
    }

    public static IdentityResult failure(String errorReason, boolean retryable) {
        return new IdentityResult(false, null, errorReason, retryable, Map.of());
    }

    public static IdentityResult failure(String errorReason, boolean retryable,
                                          Map<String, Object> metadata) {
        return new IdentityResult(false, null, errorReason, retryable, metadata);
    }
}
