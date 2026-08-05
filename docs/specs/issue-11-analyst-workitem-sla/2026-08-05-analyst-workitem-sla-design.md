# Analyst WorkItem & SLA Breach Policy — Design Spec

**Date:** 2026-08-05
**Issues:** casehubio/soc#11 (Analyst WorkItem), casehubio/soc#12 (SLA breach policy)
**Branch:** issue-11-analyst-workitem-sla
**Parent spec:** docs/specs/slice-1-siem-critical-alert/2026-07-29-slice-1-design.md (Layer 3)
**Review:** Light post-spec review (coherence + structure + robustness + cross-cutting). Key findings resolved below.

---

## Overview

Two components that complete Layer 3 of the SOC vertical slice:

1. **Analyst WorkItem** — enhancement of the existing `analyst-review` YAML binding with named outcomes, dynamic SLA windows, scope-based priority, and input/output mappings.
2. **SocSlaBreachPolicy** — first real `SlaBreachPolicy` SPI implementation in the platform, providing priority-differentiated escalation chains for SOC incident response.

Both components are YAML-first and SPI-driven — no new domain entities, no new JPA, no framework extensions.

---

## Component 1: Analyst WorkItem (#11)

### Approach

Enhance the existing `analyst-review` binding in `app/src/main/resources/soc/incident-investigation.yaml`. The YAML parser (`CaseDefinitionYamlMapper.convertHumanTask()`) supports all required fields: outcomes, scope/scopeExpression, expiresInExpression, inputMapping, outputMapping, candidateGroups.

No new Java classes needed — the engine's `HumanTaskScheduleHandler` creates the WorkItem when the binding fires.

### YAML Binding

```yaml
- name: analyst-review
  on: { contextChange: {} }
  when: ".containmentRecommendation != null and .analystDecision == null"
  humanTask:
    title: "Review incident findings and containment recommendation"
    candidateGroups:
      - soc-tier1-analyst
    outcomes:
      - CONFIRM_SEVERITY
      - DOWNGRADE
      - ESCALATE
      - FALSE_POSITIVE
    scopeExpression: >-
      "casehubio/soc/triage-review/" + (
        if .alert.severity == "CRITICAL" then "p1"
        elif .alert.severity == "HIGH" then "p2"
        else "p3"
        end
      )
    expiresInExpression: >-
      if .alert.severity == "CRITICAL" then "PT15M"
      elif .alert.severity == "HIGH" then "PT1H"
      elif .alert.severity == "MEDIUM" then "PT24H"
      else "PT24H"
      end
    inputMapping: >-
      {
        incidentId: .caseId,
        priority: .alert.severity,
        alert: .alert,
        iocEnrichment: .iocEnrichment,
        attckMapping: .attckMapping,
        containmentRecommendation: .containmentRecommendation
      }
    outputMapping: >-
      {
        analystDecision: (
          if .outcome == "CONFIRM_SEVERITY" or .outcome == "DOWNGRADE"
          then "resolved"
          elif .outcome == "ESCALATE" then "escalated"
          elif .outcome == "FALSE_POSITIVE" then "false-positive"
          else .outcome
          end
        )
      }
```

### Key Decisions

**Candidate groups: `soc-tier1-analyst`** (not tier2 as in the original YAML). Start at the lowest tier; SlaBreachPolicy escalates upward on breach. This gives the full escalation chain: tier1 → tier2 → tier3 → SOC manager.

**Dynamic scope via `scopeExpression`**: Encodes priority tier in the scope path (`casehubio/soc/triage-review/p1|p2|p3`). This serves two purposes:
1. Preference resolution hierarchy — P1 WorkItems can have different preferences than P3
2. Priority signal for `SocSlaBreachPolicy` — reads `context.scope().segments().getLast()` to determine escalation chain

**Dynamic completion deadline via `expiresInExpression`**: JQ expression evaluates alert severity from case context:
- CRITICAL → PT15M (15 minutes)
- HIGH → PT1H (1 hour)
- MEDIUM/LOW → PT24H (24 hours)

**Outcome-to-goal mapping via `outputMapping`**: Translates WorkItem outcomes to case goal values:
- CONFIRM_SEVERITY, DOWNGRADE → `"resolved"` (case goal: resolved)
- ESCALATE → `"escalated"` (case goal: escalated)
- FALSE_POSITIVE → `"false-positive"` (case goal: false-positive)

DOWNGRADE maps to `"resolved"` because both close the incident. The severity override signal is a Layer 4 concern (trust attestation feedback).

**No claim deadline**: `claimDeadlineHours` (Integer) can't express sub-hour windows (P1 needs 5min claim). Platform gap — see below. Note: after a COMPLETION_EXPIRED escalation, `ExpiryLifecycleService.executeEscalateTo()` sets a new `claimDeadline` via `ClaimSlaPolicy`, so CLAIM_EXPIRED fires on subsequent tiers even without an initial claim deadline.

### Input/Output Data Flow

```
Case Context (pre-binding)          WorkItem Payload (inputMapping)
─────────────────────────           ────────────────────────────────
.caseId                      →      incidentId
.alert.severity              →      priority
.alert                       →      alert
.iocEnrichment               →      iocEnrichment
.attckMapping                →      attckMapping
.containmentRecommendation   →      containmentRecommendation

WorkItem Resolution (outcome)       Case Context (outputMapping)
─────────────────────────────       ────────────────────────────
CONFIRM_SEVERITY             →      analystDecision: "resolved"
DOWNGRADE                    →      analystDecision: "resolved"
ESCALATE                     →      analystDecision: "escalated"
FALSE_POSITIVE               →      analystDecision: "false-positive"
```

---

## Component 2: SocSlaBreachPolicy (#12)

### Approach

Pure SPI implementation in `app/`. `SocSlaBreachPolicy implements SlaBreachPolicy` with `id() = "soc-escalation"`. Stateless — reads `BreachedTask.candidateGroups()` to determine current tier, reads `SlaBreachContext.scope()` to determine priority.

Policy selection is **config-driven** via `StrategyResolver`, not CDI displacement. `ExpiryLifecycleService` resolves the policy at startup:
```java
this.slaBreachPolicy = strategyResolver.resolve(SlaBreachPolicy.class, config.sla().breachPolicy());
```

Configuration: `casehub.work.sla.breach-policy=soc-escalation` in `application.properties` (default is `"no-op"`). Both `NoOpSlaBreachPolicy` and `SocSlaBreachPolicy` coexist in CDI — the resolver picks by `id()`.

### Priority Resolution

Priority is encoded in the scope path by the analyst-review binding's `scopeExpression`. The policy extracts it from `Path.segments()`:

```java
private String resolvePriority(SlaBreachContext context) {
    if (context.scope() == null || context.scope().segments().isEmpty()) return "P3";
    String last = context.scope().segments().getLast();
    return switch (last) {
        case "p1" -> "P1";
        case "p2" -> "P2";
        default -> "P3";
    };
}
```

**Scope guard**: The policy checks for the `casehubio/soc` scope prefix. WorkItems from other applications (if any share the deployment) get P3 default behavior.

### Escalation Model — Pure Stateless, No Chained

**Design review finding (cross-cutting R1-01):** `BreachDecision.Chained` is an atomic same-event fallback — the primary executes, and the fallback only runs if the primary throws `BreachExecutionFailed`. `Extend` never throws, so `Extend.thenOnBreach(EscalateTo)` infinite-loops on Extend. `EscalateTo` with non-empty groups never throws, so `EscalateTo.thenOnBreach(Fail)` never reaches Fail.

**Resolution:** Do not use `thenOnBreach()` / `Chained` at all. Every `onBreach()` call returns a **flat** (non-Chained) decision. Cross-breach progression comes entirely from the stateless tier detection pattern — each breach event re-calls `onBreach()`, which reads the updated `candidateGroups` and returns a different decision.

### Escalation Chains

Each `onBreach()` call reads current groups and priority, returns a single flat decision.

#### P1 (CRITICAL) — Maximum urgency, skip intermediate tiers

| BreachType | Current Groups | Decision |
|---|---|---|
| COMPLETION_EXPIRED | tier1 or tier2 or tier3 | `EscalateTo(SOC_MANAGER, 30min)` |
| COMPLETION_EXPIRED | soc-manager | `Exhausted("P1 SLA exceeded")` |
| CLAIM_EXPIRED | any | Same as COMPLETION_EXPIRED |

P1 bypasses tier2/tier3 — critical incidents go straight to SOC manager. Terminal: `Exhausted` (sets WorkItem status to ESCALATED).

#### P2 (HIGH) — Full tier escalation on claim, direct escalation on completion

| BreachType | Current Groups | Decision |
|---|---|---|
| CLAIM_EXPIRED | tier1 | `EscalateTo(TIER2_ANALYST, 1hr)` |
| CLAIM_EXPIRED | tier2 | `EscalateTo(TIER3_ANALYST, 2hr)` |
| CLAIM_EXPIRED | tier3 | `EscalateTo(SOC_MANAGER, 2hr)` |
| CLAIM_EXPIRED | soc-manager | `Exhausted("P2 SLA exceeded")` |
| COMPLETION_EXPIRED | any non-manager | `EscalateTo(SOC_MANAGER, 2hr)` |
| COMPLETION_EXPIRED | soc-manager | `Exhausted("P2 SLA exceeded")` |

P2 escalates through the full chain on claim breach. On completion breach, goes directly to SOC manager.

#### P3 (default) — Lower urgency, escalate with longer deadlines

| BreachType | Current Groups | Decision |
|---|---|---|
| COMPLETION_EXPIRED | tier1 or tier2 or tier3 | `EscalateTo(SOC_MANAGER, 24hr)` |
| COMPLETION_EXPIRED | soc-manager | `Exhausted("P3 SLA exceeded")` |
| CLAIM_EXPIRED | any non-manager | `EscalateTo(SOC_MANAGER, 24hr)` |
| CLAIM_EXPIRED | soc-manager | `Exhausted("P3 SLA exceeded")` |

P3 uses long deadlines (24hr) rather than `Extend` — avoids the `Chained` infinite-loop problem. The long deadline itself provides the "more time" that `Extend` was intended for.

### Terminal Decision: Exhausted, Not Fail

**Design review finding (coherence R1-02, robustness R1-02):** `BreachDecision.Fail` sets WorkItem status to `EXPIRED`. `BreachDecision.Exhausted` sets status to `ESCALATED`. Issue #12 requires the ESCALATED terminal state when all escalation targets are consumed.

All terminal decisions use `Exhausted(reason)`, never `Fail`. Verified against `ExpiryLifecycleService`:
- `executeFail()` → `WorkItemStatus.EXPIRED`, audit event "EXPIRED"
- `executeExhausted()` → `WorkItemStatus.ESCALATED`, audit event "ESCALATED"

### Stateless Tier Detection

The policy reads `context.task().candidateGroups()` to determine the current tier. When the work module executes an `EscalateTo` decision, it replaces the WorkItem's `candidateGroups`. On the next breach, the same policy logic sees the updated groups and returns a different decision.

```
Initial:     candidateGroups = {soc-tier1-analyst}
1st breach:  policy sees tier1 → EscalateTo(tier2, 1hr)
             work module replaces groups → {soc-tier2-analyst}
2nd breach:  policy sees tier2 → EscalateTo(tier3, 2hr)
             work module replaces groups → {soc-tier3-analyst}
3rd breach:  policy sees tier3 → EscalateTo(SOC_MANAGER, 2hr)
4th breach:  policy sees soc-manager → Exhausted("SLA exceeded")
```

No state machine, no persistence, no Chained decisions. The WorkItem's own groups are the state.

**Unrecognized groups fallback:** If `candidateGroups` contains none of the known SOC groups (tier1/tier2/tier3/soc-manager), return `Exhausted("unknown-escalation-tier")`. This prevents silent infinite loops from group name mismatches.

### Case Stall on Exhausted

**Design review finding (robustness R1-04):** When the SLA breach policy returns `Exhausted`, the WorkItem reaches terminal ESCALATED status. But no analyst completed the WorkItem with an outcome, so `outputMapping` never runs and `analystDecision` is never set in case context. The case stalls.

**Resolution:** The existing `SocFaultedCaseReviewCreator` pattern handles this — a CDI observer watches for WorkItem lifecycle events. Add a similar observer `SocEscalatedWorkItemHandler` that:
1. Listens for WorkItem `ESCALATED` lifecycle events on SOC WorkItems
2. Sets `analystDecision = "escalated"` in the case context
3. The case then completes via the `escalated` goal

This bridges the gap between the work module's terminal state and the engine's case goal system.

### Class Structure

```
app/src/main/java/io/casehub/soc/work/
    SocSlaBreachPolicy.java              — SlaBreachPolicy implementation
    SocEscalatedWorkItemHandler.java     — bridges WorkItem ESCALATED → case context

app/src/test/java/io/casehub/soc/work/
    SocSlaBreachPolicyTest.java          — unit test (plain JUnit, no CDI)
    SocEscalatedWorkItemHandlerTest.java — unit test
```

Package `io.casehub.soc.work` — separates work-module concerns from engine concerns (`io.casehub.soc.engine`).

---

## Configuration

In `application.properties`:

```properties
casehub.work.sla.breach-policy=soc-escalation
```

This selects `SocSlaBreachPolicy` (id=`"soc-escalation"`) via `StrategyResolver`. Both `NoOpSlaBreachPolicy` and `SocSlaBreachPolicy` coexist in CDI — no exclusion needed.

No changes to `quarkus.arc.exclude-types`.

---

## Testing Strategy

### Unit Tests

**SocSlaBreachPolicyTest** — plain JUnit, no CDI container:
- Each priority × breachType × candidateGroups combination
- Verify correct BreachDecision variant (EscalateTo or Exhausted — never Fail, never Chained)
- Verify escalation targets (correct SocGroups constants)
- Verify deadlines on EscalateTo decisions
- Null/empty scope defaults to P3
- Unknown scope segment defaults to P3
- Unrecognized candidateGroups returns Exhausted (fallback)
- No Chained decisions in any return path

**SocEscalatedWorkItemHandlerTest** — plain JUnit:
- ESCALATED lifecycle event on SOC WorkItem → sets analystDecision in case context
- Non-SOC WorkItem ESCALATED event → ignored
- Non-ESCALATED event → ignored

### Integration Tests

**AnalystWorkItemIntegrationTest** — `@QuarkusTest`:
- YAML binding fires when `.containmentRecommendation != null and .analystDecision == null`
- WorkItem created with correct outcomes (CONFIRM_SEVERITY, DOWNGRADE, ESCALATE, FALSE_POSITIVE)
- WorkItem scope includes priority tier from alert severity
- Dynamic expiresIn matches alert severity (CRITICAL → 15min, HIGH → 1hr)
- Candidate groups = soc-tier1-analyst
- Outcome completion updates case context with correct analystDecision value
- Each outcome → correct goal satisfaction (resolved/escalated/false-positive)
- Case completes after analyst decision

**SlaBreachIntegrationTest** — `@QuarkusTest`:
- SocSlaBreachPolicy selected via `casehub.work.sla.breach-policy=soc-escalation`
- Breach on P1 WorkItem escalates directly to SOC_MANAGER
- Breach on P2 WorkItem escalates tier-by-tier
- Terminal breach produces Exhausted (ESCALATED status, not EXPIRED)
- `SocEscalatedWorkItemHandler` bridges ESCALATED → case context

---

## Platform Gap

**Sub-hour claim deadlines**: `HumanTaskTarget.claimDeadlineHours(Integer)` only supports whole hours. P1 needs a 5-minute claim window; P2 needs 15 minutes. The initial WorkItem has no claim deadline, so CLAIM_EXPIRED does not fire on the first assignment. After a COMPLETION_EXPIRED escalation, `ExpiryLifecycleService.executeEscalateTo()` calls `ClaimSlaPolicy.computePoolDeadline()` to set a new `claimDeadline`, so CLAIM_EXPIRED fires on subsequent tiers.

**Recommendation**: File a platform issue on casehubio/engine for `claimDeadlineExpression(String jqExpression)` on `HumanTaskTarget`.

---

## Files Changed

| File | Change |
|---|---|
| `app/src/main/resources/soc/incident-investigation.yaml` | Enhance analyst-review binding |
| `app/src/main/java/io/casehub/soc/work/SocSlaBreachPolicy.java` | New — SlaBreachPolicy implementation |
| `app/src/main/java/io/casehub/soc/work/SocEscalatedWorkItemHandler.java` | New — bridges ESCALATED → case context |
| `app/src/main/resources/application.properties` | Set `casehub.work.sla.breach-policy=soc-escalation` |
| `app/src/test/java/io/casehub/soc/work/SocSlaBreachPolicyTest.java` | New — unit tests |
| `app/src/test/java/io/casehub/soc/work/SocEscalatedWorkItemHandlerTest.java` | New — unit tests |
| `app/src/test/java/io/casehub/soc/integration/AnalystWorkItemIntegrationTest.java` | New — integration test |
| `app/src/test/java/io/casehub/soc/integration/SlaBreachIntegrationTest.java` | New — integration test |

## Review Findings Resolved

| Finding | Source | Resolution |
|---|---|---|
| `Path.lastSegment()` doesn't exist | All 3 dimensions | Use `context.scope().segments().getLast()` |
| `Fail` vs `Exhausted` terminal semantics | Coherence R1-02, Robustness R1-02 | Use `Exhausted` everywhere — sets ESCALATED, not EXPIRED |
| `Chained`/`thenOnBreach()` infinite-loop | Cross-cutting R1-01 | Removed all Chained usage — pure stateless flat decisions |
| CLAIM_EXPIRED unreachable on initial assignment | Robustness R1-03 | Documented — fires after first COMPLETION_EXPIRED escalation |
| Case stalls on Exhausted | Robustness R1-04 | Added `SocEscalatedWorkItemHandler` to bridge ESCALATED → case context |
| CDI displacement wrong mechanism | Structure R1-05 | Config-driven: `casehub.work.sla.breach-policy=soc-escalation` |
| Unrecognized groups silent failure | Robustness R1-07 | Added fallback: unknown groups → `Exhausted("unknown-escalation-tier")` |
| Missing SLA breach integration test | Coherence R1-07 | Added `SlaBreachIntegrationTest` to test plan |

## Garden Entries Referenced

- GE-20260522-work — BreachDecision sealed interface design, stateless two-tier pattern
- GE-20260604-work — BreachDecision.Exhausted variant
- GE-20260729-soc — Slice 1 design spec (SocSlaBreachPolicy escalation chains)
