package io.casehub.soc.engine.spi;

import java.util.Map;

public record ContainmentRequest(
    String actionType,
    Map<String, Object> parameters,
    String caseId,
    String incidentId,
    String approver,
    String tenancyId,
    long timeoutMs
) {
    public static ContainmentRequest from(String actionType, Map<String, Object> parameters,
                                           ContainmentContext context) {
        return new ContainmentRequest(
                actionType, parameters,
                context.caseId().toString(),
                context.incidentId(),
                context.approver(),
                context.tenancyId(),
                context.timeoutMs());
    }
}
