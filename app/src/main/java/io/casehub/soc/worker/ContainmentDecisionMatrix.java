package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.ContainmentRecommendationOutput;

import java.util.Map;

public final class ContainmentDecisionMatrix {

    private ContainmentDecisionMatrix() {}

    public static ContainmentRecommendationOutput decide(String severity, String primaryTactic) {
        return switch (severity) {
            case "CRITICAL" -> decideCritical(primaryTactic);
            case "HIGH" -> decideHigh(primaryTactic);
            case "MEDIUM" -> new ContainmentRecommendationOutput(
                    "BLOCK_IP", 0.30, 0.60,
                    "Medium severity — block source IP as precaution",
                    Map.of());
            case "LOW" -> new ContainmentRecommendationOutput(
                    null, 0.10, 0.40,
                    "Low severity — monitoring recommended, no active containment",
                    Map.of());
            default -> new ContainmentRecommendationOutput(
                    "BLOCK_IP", 0.30, 0.50,
                    "Unknown severity — defaulting to IP block",
                    Map.of());
        };
    }

    private static ContainmentRecommendationOutput decideCritical(String tactic) {
        return switch (tactic) {
            case "CREDENTIAL_ACCESS" -> new ContainmentRecommendationOutput(
                    "REVOKE_CREDENTIALS", 0.60, 0.90,
                    "Critical credential access — revoke all compromised credentials",
                    Map.of());
            case "LATERAL_MOVEMENT" -> new ContainmentRecommendationOutput(
                    "ISOLATE_HOST", 0.85, 0.85,
                    "Critical lateral movement — isolate affected host immediately",
                    Map.of());
            case "EXFILTRATION" -> new ContainmentRecommendationOutput(
                    "NETWORK_SEGMENTATION", 0.95, 0.90,
                    "Critical exfiltration — segment network to prevent data loss",
                    Map.of());
            default -> new ContainmentRecommendationOutput(
                    "ISOLATE_HOST", 0.75, 0.80,
                    "Critical threat — isolate host as precaution",
                    Map.of());
        };
    }

    private static ContainmentRecommendationOutput decideHigh(String tactic) {
        return switch (tactic) {
            case "INITIAL_ACCESS" -> new ContainmentRecommendationOutput(
                    "BLOCK_IP", 0.40, 0.70,
                    "High severity initial access — block source IP",
                    Map.of());
            case "EXECUTION" -> new ContainmentRecommendationOutput(
                    "ISOLATE_HOST", 0.75, 0.80,
                    "High severity execution — isolate host to prevent spread",
                    Map.of());
            default -> new ContainmentRecommendationOutput(
                    "BLOCK_IP", 0.40, 0.65,
                    "High severity — block source IP",
                    Map.of());
        };
    }
}
