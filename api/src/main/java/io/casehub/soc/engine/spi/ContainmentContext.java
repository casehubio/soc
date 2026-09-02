package io.casehub.soc.engine.spi;

import java.util.UUID;

public record ContainmentContext(
    UUID caseId,
    String incidentId,
    String approver,
    String tenancyId,
    long timeoutMs
) {
    public static final long DEFAULT_TIMEOUT_MS = 30_000;

    public ContainmentContext(UUID caseId, String incidentId, String approver, String tenancyId) {
        this(caseId, incidentId, approver, tenancyId, DEFAULT_TIMEOUT_MS);
    }
}
