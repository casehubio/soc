package io.casehub.soc.work;

import io.casehub.platform.api.path.Path;
import io.casehub.platform.api.preferences.MapPreferences;
import io.casehub.soc.domain.SocGroups;
import io.casehub.work.api.BreachDecision;
import io.casehub.work.api.BreachType;
import io.casehub.work.api.BreachedTask;
import io.casehub.work.api.SlaBreachContext;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocSlaBreachPolicyTest {

    private final SocSlaBreachPolicy policy = new SocSlaBreachPolicy();

    // ── Identity ──────────────────────────────────────────────────────

    @Test
    void id_isSocEscalation() {
        assertThat(policy.id()).isEqualTo("soc-escalation");
    }

    // ── P1 (CRITICAL) — skip to SOC manager ───────────────────────────

    @Test
    void p1_completionExpired_tier1_escalatesToSocManager() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "p1");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        var escalate = (BreachDecision.EscalateTo) decision;
        assertThat(escalate.groups()).containsExactly(SocGroups.SOC_MANAGER);
        assertThat(escalate.deadline()).isEqualTo(Duration.ofMinutes(30));
    }

    @Test
    void p1_completionExpired_tier2_escalatesToSocManager() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.TIER2_ANALYST), "p1");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).groups()).containsExactly(SocGroups.SOC_MANAGER);
    }

    @Test
    void p1_completionExpired_socManager_exhausted() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.SOC_MANAGER), "p1");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.Exhausted.class);
        assertThat(((BreachDecision.Exhausted) decision).reason()).contains("P1");
    }

    @Test
    void p1_claimExpired_tier1_escalatesToSocManager() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "p1");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).groups()).containsExactly(SocGroups.SOC_MANAGER);
    }

    @Test
    void p1_claimExpired_socManager_exhausted() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.SOC_MANAGER), "p1");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.Exhausted.class);
    }

    // ── P2 (HIGH) — tier-by-tier on claim, direct on completion ───────

    @Test
    void p2_claimExpired_tier1_escalatesToTier2() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        var escalate = (BreachDecision.EscalateTo) decision;
        assertThat(escalate.groups()).containsExactly(SocGroups.TIER2_ANALYST);
        assertThat(escalate.deadline()).isEqualTo(Duration.ofHours(1));
    }

    @Test
    void p2_claimExpired_tier2_escalatesToTier3() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.TIER2_ANALYST), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).groups()).containsExactly(SocGroups.TIER3_ANALYST);
        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(2));
    }

    @Test
    void p2_claimExpired_tier3_escalatesToSocManager() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.TIER3_ANALYST), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).groups()).containsExactly(SocGroups.SOC_MANAGER);
        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(2));
    }

    @Test
    void p2_claimExpired_socManager_exhausted() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.SOC_MANAGER), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.Exhausted.class);
        assertThat(((BreachDecision.Exhausted) decision).reason()).contains("P2");
    }

    @Test
    void p2_completionExpired_tier1_escalatesToSocManager() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).groups()).containsExactly(SocGroups.SOC_MANAGER);
        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(2));
    }

    @Test
    void p2_completionExpired_socManager_exhausted() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.SOC_MANAGER), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.Exhausted.class);
    }

    // ── P3 (default) — long deadline escalation ───────────────────────

    @Test
    void p3_completionExpired_tier1_escalatesToSocManager_24hr() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "p3");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).groups()).containsExactly(SocGroups.SOC_MANAGER);
        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void p3_completionExpired_socManager_exhausted() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.SOC_MANAGER), "p3");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.Exhausted.class);
        assertThat(((BreachDecision.Exhausted) decision).reason()).contains("P3");
    }

    @Test
    void p3_claimExpired_tier1_escalatesToSocManager_24hr() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "p3");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(24));
    }

    // ── Defaults and edge cases ───────────────────────────────────────

    @Test
    void nullScope_defaultsToP3() {
        var task = new BreachedTask(UUID.randomUUID(), "ref", "title", Set.of(SocGroups.TIER1_ANALYST));
        var ctx = new SlaBreachContext(BreachType.COMPLETION_EXPIRED, task, null, new MapPreferences(Map.of()));
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.EscalateTo.class);
        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void unknownScopeSegment_defaultsToP3() {
        var ctx = context(BreachType.COMPLETION_EXPIRED, Set.of(SocGroups.TIER1_ANALYST), "unknown");
        var decision = policy.onBreach(ctx);

        assertThat(((BreachDecision.EscalateTo) decision).deadline()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void unrecognizedGroups_returnsExhausted() {
        var ctx = context(BreachType.CLAIM_EXPIRED, Set.of("random-group"), "p2");
        var decision = policy.onBreach(ctx);

        assertThat(decision).isInstanceOf(BreachDecision.Exhausted.class);
        assertThat(((BreachDecision.Exhausted) decision).reason()).contains("unknown-escalation-tier");
    }

    @Test
    void noDecisionIsChained() {
        for (String priority : List.of("p1", "p2", "p3")) {
            for (BreachType type : BreachType.values()) {
                for (String group : List.of(SocGroups.TIER1_ANALYST, SocGroups.TIER2_ANALYST,
                        SocGroups.TIER3_ANALYST, SocGroups.SOC_MANAGER)) {
                    var ctx = context(type, Set.of(group), priority);
                    var decision = policy.onBreach(ctx);
                    assertThat(decision).as("priority=%s type=%s group=%s", priority, type, group)
                            .isNotInstanceOf(BreachDecision.Chained.class);
                }
            }
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private SlaBreachContext context(BreachType type, Set<String> groups, String prioritySegment) {
        Path scope = Path.parse("casehubio/soc/triage-review/" + prioritySegment);
        var task = new BreachedTask(UUID.randomUUID(), "analyst-review:case-1",
                "Review incident", groups);
        return new SlaBreachContext(type, task, scope, new MapPreferences(Map.of()));
    }
}
