package io.casehub.soc.domain;

import io.casehub.api.spi.routing.CandidateSetStrategy;
import io.casehub.api.spi.routing.StaticSetStrategy;
import java.util.Arrays;
import java.util.Optional;

/**
 * Typed taxonomy of consequential SOC actions that workers may declare as {@code PlannedAction}
 * before the engine advances the case. Each constant encodes its gate policy,
 * reversibility, candidate approver groups, and reason string.
 *
 * <p>Follows casehub-aml's {@code AmlActionType} pattern: classification logic lives in the
 * {@code ActionRiskClassifier} implementation; this enum owns only the data.
 */
public enum SocActionType {

    ENABLE_ENHANCED_LOGGING(
            GatePolicy.NEVER, true,
            StaticSetStrategy.of(),
            "Enable enhanced logging — fully reversible, no approval needed"),

    ROTATE_API_KEY(
            GatePolicy.CONFIDENCE_THRESHOLD, true,
            StaticSetStrategy.of(SocGroups.TIER2_ANALYST),
            "API key rotation — reversible but may disrupt integrations"),

    BLOCK_IP(
            GatePolicy.RISK_SCORE_THRESHOLD, false,
            StaticSetStrategy.of(SocGroups.TIER2_ANALYST),
            "IP block at firewall — may affect legitimate traffic"),

    BLOCK_DOMAIN(
            GatePolicy.RISK_SCORE_THRESHOLD, false,
            StaticSetStrategy.of(SocGroups.TIER2_ANALYST),
            "Domain block at DNS/proxy — may affect legitimate traffic"),

    DISABLE_USER_ACCOUNT(
            GatePolicy.ALWAYS, false,
            StaticSetStrategy.of(SocGroups.SOC_MANAGER),
            "Disable user account — affects individual access"),

    ISOLATE_HOST(
            GatePolicy.ALWAYS, false,
            StaticSetStrategy.of(SocGroups.SOC_MANAGER),
            "Network isolation of endpoint — takes system offline"),

    REVOKE_CREDENTIALS(
            GatePolicy.ALWAYS, false,
            StaticSetStrategy.of(SocGroups.SOC_MANAGER),
            "Credential revocation — invalidates all active sessions"),

    NETWORK_SEGMENTATION(
            GatePolicy.ALWAYS, false,
            StaticSetStrategy.of(SocGroups.SOC_MANAGER, SocGroups.NETWORK_OPS),
            "Network segmentation change — affects network topology"),

    WIPE_ENDPOINT(
            GatePolicy.ALWAYS, false,
            StaticSetStrategy.of(SocGroups.SOC_MANAGER, SocGroups.CISO),
            "Remote endpoint wipe — irreversible data loss");

    public enum GatePolicy {
        NEVER,
        RISK_SCORE_THRESHOLD,
        CONFIDENCE_THRESHOLD,
        ALWAYS
    }

    private static final String OVERSIGHT_SCOPE = "casehubio/soc/oversight";

    private final GatePolicy gatePolicy;
    private final boolean reversible;
    private final CandidateSetStrategy candidateGroups;
    private final String reason;

    SocActionType(GatePolicy gatePolicy, boolean reversible,
                  CandidateSetStrategy candidateGroups, String reason) {
        this.gatePolicy = gatePolicy;
        this.reversible = reversible;
        this.candidateGroups = candidateGroups;
        this.reason = reason;
    }

    public GatePolicy gatePolicy() { return gatePolicy; }
    public boolean reversible() { return reversible; }
    public CandidateSetStrategy candidateGroups() { return candidateGroups; }
    public String reason() { return reason; }
    public String scope() { return OVERSIGHT_SCOPE; }

    public String actionType() {
        return name().toLowerCase().replace('_', '.');
    }

    public static Optional<SocActionType> fromActionType(String actionType) {
        if (actionType == null) return Optional.empty();
        return Arrays.stream(values())
                .filter(a -> a.actionType().equals(actionType))
                .findFirst();
    }
}
