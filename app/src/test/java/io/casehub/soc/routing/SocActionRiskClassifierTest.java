package io.casehub.soc.routing;

import io.casehub.api.spi.ClassificationContext;
import io.casehub.api.spi.RiskDecision;
import io.casehub.soc.domain.SocActionType;
import io.casehub.soc.domain.SocGroups;
import io.casehub.worker.api.PlannedAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class SocActionRiskClassifierTest {

    private static final ClassificationContext TEST_CTX =
        new ClassificationContext("test-worker", UUID.randomUUID(), "default", "soc-test", "test-cap", "test-binding");

    SocActionRiskClassifier classifier;

    @BeforeEach
    void setUp() {
        classifier = new SocActionRiskClassifier();
    }

    // ── NEVER-gated types ───────────────────────────────────────────────────

    @Test
    void enableEnhancedLogging_neverGates() {
        final RiskDecision result = classify(SocActionType.ENABLE_ENHANCED_LOGGING, Map.of());
        assertInstanceOf(RiskDecision.Autonomous.class, result,
            "NEVER-gated action must be Autonomous");
    }

    @Test
    void enableEnhancedLogging_neverGatesEvenWithHighRisk() {
        final RiskDecision result = classify(SocActionType.ENABLE_ENHANCED_LOGGING,
            Map.of("riskScore", 1.0));
        assertInstanceOf(RiskDecision.Autonomous.class, result);
    }

    // ── ALWAYS-gated types ──────────────────────────────────────────────────

    @Test
    void disableUserAccount_alwaysGates() {
        final RiskDecision result = classify(SocActionType.DISABLE_USER_ACCOUNT, Map.of());
        assertGateRequired(result, SocGroups.SOC_MANAGER, false);
    }

    @Test
    void isolateHost_alwaysGates() {
        final RiskDecision result = classify(SocActionType.ISOLATE_HOST, Map.of());
        assertGateRequired(result, SocGroups.SOC_MANAGER, false);
    }

    @Test
    void revokeCredentials_alwaysGates() {
        final RiskDecision result = classify(SocActionType.REVOKE_CREDENTIALS, Map.of());
        assertGateRequired(result, SocGroups.SOC_MANAGER, false);
    }

    @Test
    void networkSegmentation_alwaysGates() {
        final RiskDecision result = classify(SocActionType.NETWORK_SEGMENTATION, Map.of());
        assertGateRequired(result, SocGroups.SOC_MANAGER, false);
    }

    @Test
    void wipeEndpoint_alwaysGatesWithCiso() {
        final RiskDecision result = classify(SocActionType.WIPE_ENDPOINT, Map.of());
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertTrue(gate.candidateGroups().contains(SocGroups.CISO),
            "WIPE_ENDPOINT must require CISO approval");
    }

    // ── BLOCK_IP (RISK_SCORE_THRESHOLD) ─────────────────────────────────────

    @Test
    void blockIp_highRiskScore_gates() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP,
            Map.of("riskScore", 0.9));
        assertGateRequired(result, SocGroups.TIER2_ANALYST, false);
    }

    @Test
    void blockIp_atThreshold_gates() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP,
            Map.of("riskScore", 0.8));
        assertGateRequired(result, SocGroups.TIER2_ANALYST, false);
    }

    @Test
    void blockIp_belowThreshold_autonomous() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP,
            Map.of("riskScore", 0.5));
        assertInstanceOf(RiskDecision.Autonomous.class, result);
    }

    @Test
    void blockIp_justBelowThreshold_autonomous() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP,
            Map.of("riskScore", 0.799));
        assertInstanceOf(RiskDecision.Autonomous.class, result);
    }

    @Test
    void blockIp_missingRiskScore_failClosed() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP, Map.of());
        assertGateRequiredWithReason(result, "Risk assessment unavailable");
    }

    @Test
    void blockIp_nullParams_failClosed() {
        final RiskDecision result = classifier.classify(
            PlannedAction.of("desc", SocActionType.BLOCK_IP.actionType(), null), TEST_CTX);
        assertGateRequiredWithReason(result, "Risk assessment unavailable");
    }

    // ── BLOCK_DOMAIN (RISK_SCORE_THRESHOLD) ─────────────────────────────────

    @Test
    void blockDomain_highRiskScore_gates() {
        final RiskDecision result = classify(SocActionType.BLOCK_DOMAIN,
            Map.of("riskScore", 0.85));
        assertGateRequired(result, SocGroups.TIER2_ANALYST, false);
    }

    @Test
    void blockDomain_lowRiskScore_autonomous() {
        final RiskDecision result = classify(SocActionType.BLOCK_DOMAIN,
            Map.of("riskScore", 0.3));
        assertInstanceOf(RiskDecision.Autonomous.class, result);
    }

    // ── ROTATE_API_KEY (CONFIDENCE_THRESHOLD) ───────────────────────────────

    @Test
    void rotateApiKey_highConfidence_autonomous() {
        final RiskDecision result = classify(SocActionType.ROTATE_API_KEY,
            Map.of("confidenceScore", 0.95));
        assertInstanceOf(RiskDecision.Autonomous.class, result,
            "High confidence must proceed autonomously");
    }

    @Test
    void rotateApiKey_atThreshold_autonomous() {
        final RiskDecision result = classify(SocActionType.ROTATE_API_KEY,
            Map.of("confidenceScore", 0.9));
        assertInstanceOf(RiskDecision.Autonomous.class, result);
    }

    @Test
    void rotateApiKey_belowThreshold_gates() {
        final RiskDecision result = classify(SocActionType.ROTATE_API_KEY,
            Map.of("confidenceScore", 0.7));
        assertGateRequired(result, SocGroups.TIER2_ANALYST, true);
    }

    @Test
    void rotateApiKey_justBelowThreshold_gates() {
        final RiskDecision result = classify(SocActionType.ROTATE_API_KEY,
            Map.of("confidenceScore", 0.899));
        assertGateRequired(result, SocGroups.TIER2_ANALYST, true);
    }

    @Test
    void rotateApiKey_missingConfidenceScore_failClosed() {
        final RiskDecision result = classify(SocActionType.ROTATE_API_KEY, Map.of());
        assertGateRequiredWithReason(result, "Risk assessment unavailable");
    }

    // ── Unknown / null actionType ────────────────────────────────────────────

    @Test
    void unknownActionType_autonomous() {
        final RiskDecision result = classifier.classify(
            PlannedAction.of("something", "foo.bar", Map.of()), TEST_CTX);
        assertInstanceOf(RiskDecision.Autonomous.class, result,
            "Unknown action type must be Autonomous");
    }

    @Test
    void emptyActionType_autonomous() {
        final RiskDecision result = classifier.classify(
            PlannedAction.of("something", "", Map.of()), TEST_CTX);
        assertInstanceOf(RiskDecision.Autonomous.class, result);
    }

    // ── Gate properties ─────────────────────────────────────────────────────

    @Test
    void gateRequired_scopeIsSocOversight() {
        final RiskDecision result = classify(SocActionType.WIPE_ENDPOINT, Map.of());
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertEquals("casehubio/soc/oversight", gate.scope());
    }

    @Test
    void gateRequired_expiresInIsNull() {
        final RiskDecision result = classify(SocActionType.WIPE_ENDPOINT, Map.of());
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertNull(gate.expiresIn());
    }

    @Test
    void gateRequired_missingContext_usesTypeGroups() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP, Map.of());
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertEquals(SocActionType.BLOCK_IP.candidateGroups(), gate.candidateGroups());
    }

    @Test
    void gateRequired_missingContext_preservesReversible() {
        final RiskDecision result = classify(SocActionType.BLOCK_IP, Map.of());
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertFalse(gate.reversible(), "BLOCK_IP missing-context gate must be reversible=false");

        final RiskDecision result2 = classify(SocActionType.ROTATE_API_KEY, Map.of());
        final RiskDecision.GateRequired gate2 = assertInstanceOf(RiskDecision.GateRequired.class, result2);
        assertTrue(gate2.reversible(), "ROTATE_API_KEY missing-context gate must be reversible=true");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RiskDecision classify(final SocActionType type, final Map<String, Object> context) {
        return classifier.classify(PlannedAction.of("test action", type.actionType(), context), TEST_CTX);
    }

    private void assertGateRequired(final RiskDecision result, final String expectedGroup, final boolean expectedReversible) {
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertTrue(gate.candidateGroups().contains(expectedGroup),
            "Expected group " + expectedGroup + " in " + gate.candidateGroups());
        assertEquals(expectedReversible, gate.reversible());
        assertNotNull(gate.reason());
        assertFalse(gate.reason().isBlank());
    }

    private void assertGateRequiredWithReason(final RiskDecision result, final String reasonFragment) {
        final RiskDecision.GateRequired gate = assertInstanceOf(RiskDecision.GateRequired.class, result);
        assertTrue(gate.reason().contains(reasonFragment),
            "Expected reason to contain '" + reasonFragment + "' but was: " + gate.reason());
    }
}
