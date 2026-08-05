package io.casehub.soc.work;

import io.casehub.soc.domain.SocGroups;
import io.casehub.work.api.BreachDecision;
import io.casehub.work.api.BreachType;
import io.casehub.work.api.SlaBreachContext;
import io.casehub.work.api.spi.SlaBreachPolicy;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.util.Set;

@ApplicationScoped
public class SocSlaBreachPolicy implements SlaBreachPolicy {

    @Override
    public String id() {
        return "soc-escalation";
    }

    @Override
    public BreachDecision onBreach(SlaBreachContext context) {
        String priority = resolvePriority(context);
        Set<String> groups = context.task().candidateGroups();
        return switch (priority) {
            case "P1" -> p1Decision(context, groups);
            case "P2" -> p2Decision(context, groups);
            default -> p3Decision(groups);
        };
    }

    private BreachDecision p1Decision(SlaBreachContext context, Set<String> groups) {
        if (groups.contains(SocGroups.SOC_MANAGER)) {
            return new BreachDecision.Exhausted("P1 SLA exceeded — incident unresolved");
        }
        return BreachDecision.EscalateTo.to(SocGroups.SOC_MANAGER)
                .withDeadline(Duration.ofMinutes(30));
    }

    private BreachDecision p2Decision(SlaBreachContext context, Set<String> groups) {
        if (groups.contains(SocGroups.SOC_MANAGER)) {
            return new BreachDecision.Exhausted("P2 SLA exceeded — incident unresolved");
        }
        if (context.breachType() == BreachType.COMPLETION_EXPIRED) {
            return BreachDecision.EscalateTo.to(SocGroups.SOC_MANAGER)
                    .withDeadline(Duration.ofHours(2));
        }
        if (groups.contains(SocGroups.TIER1_ANALYST)) {
            return BreachDecision.EscalateTo.to(SocGroups.TIER2_ANALYST)
                    .withDeadline(Duration.ofHours(1));
        }
        if (groups.contains(SocGroups.TIER2_ANALYST)) {
            return BreachDecision.EscalateTo.to(SocGroups.TIER3_ANALYST)
                    .withDeadline(Duration.ofHours(2));
        }
        if (groups.contains(SocGroups.TIER3_ANALYST)) {
            return BreachDecision.EscalateTo.to(SocGroups.SOC_MANAGER)
                    .withDeadline(Duration.ofHours(2));
        }
        return new BreachDecision.Exhausted("unknown-escalation-tier");
    }

    private BreachDecision p3Decision(Set<String> groups) {
        if (groups.contains(SocGroups.SOC_MANAGER)) {
            return new BreachDecision.Exhausted("P3 SLA exceeded — incident unresolved");
        }
        return BreachDecision.EscalateTo.to(SocGroups.SOC_MANAGER)
                .withDeadline(Duration.ofHours(24));
    }

    private String resolvePriority(SlaBreachContext context) {
        if (context.scope() == null || context.scope().segments().isEmpty()) {
            return "P3";
        }
        String last = context.scope().segments().getLast();
        return switch (last) {
            case "p1" -> "P1";
            case "p2" -> "P2";
            default -> "P3";
        };
    }
}
