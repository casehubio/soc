# Investigation Failure Binding — Design Spec

**Date:** 2026-08-01
**Issue:** casehubio/soc#19
**Branch:** issue-19-failure-binding
**Layer:** Slice 1, Layer 3

---

## Problem

When a worker fails and all retries are exhausted, `WorkerRetriesExhaustedEventHandler` transitions the case to `CaseStatus.FAULTED`. Once FAULTED, no `contextChange` bindings fire — `CaseContextChangedEventHandler` only evaluates bindings for RUNNING or WAITING cases. The analyst-review binding in the case YAML never triggers. The investigation is stuck with no human notification.

Despite the issue title ("failure binding"), a binding is architecturally wrong here — bindings are case-internal and disabled on terminal states. The solution is an observer, which is case-external.

## Blocking Platform Issue

**`WorkerRetriesExhaustedEventHandler` calls `setState(FAULTED)` before publishing `CaseStatusChanged`.** This causes `CaseStatusChangedHandler.trySetTerminalState()` to return `false` (state already terminal), triggering an early return. Consequence: `fireOutcomeObservers()` is never reached for FAULTED cases caused by worker retry exhaustion.

**Evidence:**
- `WorkerRetriesExhaustedEventHandler` line 84: `caseInstance.setState(CaseStatus.FAULTED)` — plain setter, no lock
- `CaseStatusChanged` record passes `CaseInstance` by reference (same object)
- `CaseStatusChangedHandler` line 88: `trySetTerminalState(FAULTED)` → returns false → early return at line 92
- `trySetTerminalState()` line 119: acquires `stateLock`, checks `state == FAULTED` → true → returns false

**Fix (engine side):** `WorkerRetriesExhaustedEventHandler` must not call `setState()` directly. It should only persist the event log and publish `CaseStatusChanged`, letting `CaseStatusChangedHandler` own the terminal state transition via `trySetTerminalState()`. This aligns with how other terminal transitions work (e.g., goal-triggered completion).

**Action:** Filed as [engine#846](https://github.com/casehubio/engine/issues/846). This design is correct but blocked until the engine fix lands. The fix is small (remove `setState()` call, let the handler own the transition) and does not change the SPI contract — only the internal event ordering.

## Solution

Implement `CaseOutcomeObserver` SPI from `casehub-engine-api`. The engine calls all `CaseOutcomeObserver` beans on every terminal state transition (COMPLETED, FAULTED, CANCELLED). The SOC implementation filters for FAULTED incident investigations and creates a failure-review WorkItem via the `WorkItemCreator` SPI.

### Why CaseOutcomeObserver, not CaseLifecycleEvent

`CaseLifecycleEvent` (CDI, fired via `Event.fireAsync()`) is designed for audit and observation — ledger writes, memory capture. `CaseOutcomeObserver` is designed for outcome-based reactions — CBR retain, trust updates, and by extension, failure review WorkItem creation.

The distinction matters:
- **CaseOutcomeObserver** is case-external. It reacts to a case closing. Creating a failure-review WorkItem is an external reaction to a terminal outcome, not an internal case step.
- **Binding triggers** (including a hypothetical `statusChange` trigger) are case-internal. They operate within a running case's lifecycle. A FAULTED case is terminal — internal mechanisms are shut down.
- Even if the engine later adds `statusChange` binding triggers, `CaseOutcomeObserver` remains correct for this use case. The two mechanisms serve different purposes.

### Multi-observer environment

`CbrCaseRetainObserver` (in casehub-engine) already implements `CaseOutcomeObserver`. Both observers fire for ALL terminal states — the engine's `fireOutcomeObservers()` iterates `Instance<CaseOutcomeObserver>` and calls each. Each observer is responsible for its own filtering. Each is wrapped in try-catch — one failing doesn't block the other.

### Why not CaseStatusChanged directly

`CaseStatusChanged` is a Vert.x event bus event in `engine.common.internal` — explicitly internal to the engine. Consuming it from an application would couple to engine internals. `CaseOutcomeObserver` is the public SPI that wraps this.

## Event Chain

```
Worker retries exhausted
  → WorkerRetriesExhaustedEventHandler
    → persists FAULTED event log
    → publishes CaseStatusChanged (Vert.x event bus)
      → CaseStatusChangedHandler
        → trySetTerminalState() — sets FAULTED state
        → persists status change
        → closes channels, cancels triggers, terminates workers, closes context
        → fires CaseOutcomeObserver.onOutcome() for all observers  ← WE HOOK HERE
        → publishes CASE_FAULTED (Vert.x)
        → fires CaseLifecycleEvent (CDI fireAsync)
```

Note: This chain requires the engine fix described above. Currently, `WorkerRetriesExhaustedEventHandler` calls `setState(FAULTED)` before publishing, causing `trySetTerminalState()` to reject the transition and skip the observer call.

## Implementation

### Domain vocabulary

```java
// api/src/main/java/io/casehub/soc/SocCaseTypes.java
public final class SocCaseTypes {
    public static final String INCIDENT_INVESTIGATION = "incident-investigation";
}
```

### SocFaultedCaseReviewCreator

`@ApplicationScoped` bean in `soc/app/` implementing `CaseOutcomeObserver`.

**Filter:**
- `outcomeLabel.equals(CaseStatus.FAULTED.name())` — ignore COMPLETED and CANCELLED. Uses the enum's `name()` directly rather than a string literal to stay coupled to the type.
- `caseType.equals(SocCaseTypes.INCIDENT_INVESTIGATION)` — ignore non-SOC cases

**WorkItem creation via `WorkItemCreator` SPI** (`io.casehub.work.api.spi.WorkItemCreator` in `casehub-work-api`):
- Title derived from case context (alert source, severity)
- Priority derived from alert severity in `caseFileSnapshot` (see Priority Derivation)
- Candidate groups: `soc-tier2-analyst` (matches the analyst-review binding in case YAML)
- Payload: `event.caseFileSnapshot()` converted to `JsonNode` (the `WorkItemCreateRequest.payload` field is `JsonNode`, not `Map<String, Object>` — use `ObjectMapper.valueToTree()`)
- `callerRef`: `"case-faulted:<caseId>"` — for idempotency and traceability
- `createdBy`: `"system:soc-failure-review"`
- `tenancyId`: `event.tenancyId()` — propagated from the faulted case
- `expiresIn`: `PT4H` — matches the analyst-review binding's expiry window
- `permittedOutcomes`: contextual, derived from case type. For `incident-investigation`: ACKNOWLEDGED, ESCALATED. (RETRY is not an outcome — a FAULTED case is terminal and cannot be resumed. If the analyst wants to re-investigate, they create a new case manually.)

**Transaction handling:**
`@Transactional` interceptors silently fail inside `CaseOutcomeObserver.onOutcome()` because the engine calls observers via `Instance<T>` iteration on executor threads, not through CDI event dispatch (garden GE-20260721-4564db). Must wrap `WorkItemCreator.create()` in `QuarkusTransaction.requiringNew()`.

**Idempotency:**
The SPI makes no idempotency guarantees. Before creating, call `workItemCreator.findActiveByCallerRef("case-faulted:" + event.caseId())`. If a WorkItem already exists, skip creation. The `callerRef` field exists on `WorkItem` throughout `casehub-work` (323 references verified).

**Observability:**
- Counter metric `soc_failure_review_created_total` — incremented on successful WorkItem creation
- Counter metric `soc_failure_review_skipped_total` — incremented when idempotency check finds existing WorkItem
- Errors logged at WARN by the engine's try-catch wrapper; the observer itself logs at ERROR for creation failures before the exception propagates

### Context Snapshot

`CaseOutcomeEvent.caseFileSnapshot()` contains the working layer context at fault time — a `Map<String, Object>` with all investigation data that was successfully populated before the failure:

| Key | Present when |
|-----|-------------|
| `alert` | Always (seeded at case creation) |
| `iocEnrichment` | IOC enrichment worker succeeded |
| `attckMapping` | ATT&CK mapping worker succeeded |
| `containmentRecommendation` | Containment recommendation worker succeeded |

The analyst sees exactly how far the pipeline got and what failed.

### Priority Derivation

Alert severity is at key path `alert.severity` in the `caseFileSnapshot` map (a string matching `AlertSeverity` enum names). Map to WorkItem priority:

| Alert severity (`alert.severity`) | WorkItem priority |
|-----------------------------------|-------------------|
| CRITICAL | URGENT |
| HIGH | HIGH |
| MEDIUM | MEDIUM |
| LOW | LOW |

If `alert.severity` is absent or unrecognised, default to HIGH (fail toward urgency).

## Known Risks

| Risk | Mitigation | Status |
|------|-----------|--------|
| WorkItem creation fails (DB down, constraint violation) | Engine catches and logs at WARN. Metrics surface it. Reconciliation job is a future enhancement if failure rate warrants it. | Accepted for pre-release |
| Snapshot conversion failure silences ALL observers | Engine-level issue — `fireOutcomeObservers()` returns early if snapshot conversion throws. Affects all `CaseOutcomeObserver` implementations, not just ours. | Platform limitation, documented |

## Testing

### Unit test: SocFaultedCaseReviewCreatorTest

- FAULTED incident-investigation → WorkItem created with correct payload, priority, callerRef, tenancyId
- COMPLETED incident-investigation → no WorkItem created
- CANCELLED incident-investigation → no WorkItem created
- FAULTED non-SOC case → no WorkItem created
- Duplicate call (same caseId) → idempotent, no second WorkItem (findActiveByCallerRef returns existing)
- Empty context snapshot → WorkItem still created (analyst reviews empty state)
- Priority derivation: CRITICAL → URGENT, HIGH → HIGH, missing → HIGH
- Permitted outcomes match expected set for incident-investigation

### Integration test: SocFaultedCaseReviewIT

- Full pipeline: send CloudEvent → case created → force worker failure → case FAULTED → observer fires → WorkItem exists with investigation context
- Verify WorkItem payload contains partial investigation data (alert present, enrichment present, mapping absent if that worker failed)
- Verify tenancyId propagated correctly

**Test profile note:** Test profiles that exclude `CaseStatusChangedHandler` (e.g., `CasehubEnabledProfile`) will prevent `CaseOutcomeObserver` from firing (garden GE-20260607-609772). Integration tests must use a profile that includes it.

## Garden Entries Referenced

| ID | Relevance |
|----|-----------|
| GE-20260607-245588 | WorkerRetriesExhaustedEvent → FAULTED mechanism (the trigger) |
| GE-20260629-670471 | Duplicate CASE_FAULTED EventLog entries (observer idempotency) |
| GE-20260721-4564db | @Transactional silently fails in CaseOutcomeObserver (transaction fix) |
| GE-20260531-864d8e | @Observes vs @ObservesAsync (NOT applicable — plain interface, no CDI events) |
| GE-20260607-609772 | CaseStatusChangedHandler excluded by test profiles (test profile selection) |

## Files Changed

| File | Change |
|------|--------|
| `api/src/main/java/io/casehub/soc/SocCaseTypes.java` | New — case type constants |
| `app/src/main/java/io/casehub/soc/engine/SocFaultedCaseReviewCreator.java` | New — CaseOutcomeObserver implementation |
| `app/src/test/java/io/casehub/soc/engine/SocFaultedCaseReviewCreatorTest.java` | New — unit tests |
| `app/src/test/java/io/casehub/soc/engine/SocFaultedCaseReviewIT.java` | New — integration test |
