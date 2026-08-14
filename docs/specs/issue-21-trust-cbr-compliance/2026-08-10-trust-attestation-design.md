# Layer 4a: Trust Dimensions & Attestation Routing — Design Spec

**Date:** 2026-08-10
**Issue:** casehubio/soc#22
**Branch:** issue-21-trust-cbr-compliance
**Status:** Reviewed

---

## Overview

When a SOC incident investigation completes, the analyst's decision provides a quality signal about every worker that participated. This spec defines how that signal is captured as trust attestations and fed into the platform's Bayesian Beta trust scoring, which in turn drives trust-weighted implementation routing for future cases.

**Scope:** Trust dimensions (api/), attestation service (app/), YAML output mapping change. Routing is already handled by `TrustWeightedImplementationRoutingStrategy` in `casehub-engine-ledger` — no SOC routing code needed.

**Deliberate divergences from issue #22 acceptance criteria:**
- **Dimensions:** Issue lists four; spec implements two (`triage-accuracy`, `containment-appropriateness`). The other two (`investigation-thoroughness`, `false-positive-rate`) are not evaluable from the analyst review signal. `false-positive-rate` is a derivable metric from triage-accuracy FLAGGED ratio, not a separate dimension. Update issue to reflect.
- **Verdict mapping:** Issue says DOWNGRADE → FLAGGED for triage-accuracy. Spec uses SOUND because DOWNGRADE confirms a real incident (correct triage) — only severity was wrong. The containment-appropriateness dimension captures the proportionality failure instead.
- **Granularity:** Issue says per-case. Spec uses per-WorkerDecisionEntry for finer-grained trust signal. Per-worker scoring enables the Bayesian model to differentiate individual workers over many cases.

---

## Components

### 1. SocTrustDimensions (api/)

Constants class in `io.casehub.soc.domain`. Follows the peer app pattern (ClinicalTrustDimensions, LifeTrustDimensions).

```java
public final class SocTrustDimensions {
    public static final String TRIAGE_ACCURACY = "triage-accuracy";
    public static final String CONTAINMENT_APPROPRIATENESS = "containment-appropriateness";
    private SocTrustDimensions() {}
}
```

- `triage-accuracy` — Was this a real incident? Applies to all workers. SOUND when confirmed (CONFIRM_SEVERITY, DOWNGRADE, ESCALATE). FLAGGED on FALSE_POSITIVE.
- `containment-appropriateness` — Was the containment recommendation proportionate? Applies only to `containment-recommendation` workers. SOUND on CONFIRM_SEVERITY. FLAGGED on DOWNGRADE.

### 2. SocCaseCapabilities (api/)

Case-YAML capability name constants in `io.casehub.soc.domain`. Distinct from `SocCapabilities` which defines `soc:`-prefixed agent-registration tags.

```java
public final class SocCaseCapabilities {
    public static final String IOC_ENRICHMENT = "ioc-enrichment";
    public static final String ATTCK_MAPPING = "attck-mapping";
    public static final String CONTAINMENT_RECOMMENDATION = "containment-recommendation";
    private SocCaseCapabilities() {}
}
```

These match the capability names in the case YAML bindings and `SocAgentDescriptors`. The `WorkerDecisionEntry.capabilityTag` field carries these values.

### 3. Case YAML output mapping change

Add `analystOutcome` (raw WorkItem outcome) and `analystId` (claiming analyst) to the output mapping:

```yaml
outputMapping: >-
  {
    analystDecision: (
      if .outcome == "CONFIRM_SEVERITY" or .outcome == "DOWNGRADE"
      then "resolved"
      elif .outcome == "ESCALATE" then "escalated"
      elif .outcome == "FALSE_POSITIVE" then "false-positive"
      elif .outcome == null then "escalated"
      else .outcome
      end
    ),
    analystOutcome: .outcome,
    analystId: .completedBy
  }
```

Goals continue to evaluate on `analystDecision`. The attestation service reads `analystOutcome` and `analystId` from the case file snapshot.

### 4. SocAttestationService (app/)

`@ApplicationScoped` service in `io.casehub.soc.engine` implementing `CaseOutcomeObserver`. Follows the same SPI pattern as `SocFaultedCaseReviewCreator`.

**Trigger:** `CaseOutcomeObserver.onOutcome(CaseOutcomeEvent)` filtered on:
- `caseType` equals `SocCaseTypes.INCIDENT_INVESTIGATION`
- `outcomeLabel` is a success goal (resolved, escalated, false-positive)

**Flow:**

1. Extract `analystOutcome` and `analystId` from `caseFileSnapshot` (Map access, no JsonNode).
2. Call `CaseLedgerEntryRepository.findWorkerDecisionsByCaseId(caseId)` to get all `WorkerDecisionEntry` records.
3. For each entry, determine the verdict per the mapping table.
4. Create and save `LedgerAttestation` via `LedgerEntryRepository.saveAttestation(attestation, event.tenancyId())`.

**Transaction strategy:** The `onOutcome` method runs the attestation loop within `QuarkusTransaction.requiringNew()` (matching `SocFaultedCaseReviewCreator` pattern). Each `saveAttestation` call uses `REQUIRES_NEW` internally, so individual saves are independent.

**Verdict mapping table:**

| analystOutcome | triage-accuracy | containment-appropriateness |
|---|---|---|
| CONFIRM_SEVERITY | SOUND | SOUND (containment workers only) |
| DOWNGRADE | SOUND | FLAGGED (containment workers only) |
| ESCALATE | SOUND | — |
| FALSE_POSITIVE | FLAGGED | — |

For each WorkerDecisionEntry:
- Always write a `triage-accuracy` attestation.
- If `capabilityTag` equals `SocCaseCapabilities.CONTAINMENT_RECOMMENDATION` AND outcome is CONFIRM_SEVERITY or DOWNGRADE, also write a `containment-appropriateness` attestation.

**Attestation fields:**

| Field | Value |
|---|---|
| `id` | `UUID.randomUUID()` |
| `ledgerEntryId` | `workerDecisionEntry.id` |
| `subjectId` | `event.caseId()` |
| `attestorId` | `analystId` from context, fallback `"system:soc-attestation"` |
| `attestorType` | `ActorType.HUMAN` when analystId present, `ActorType.SYSTEM` for fallback |
| `attestorRole` | `"analyst-review-outcome"` |
| `verdict` | per verdict table |
| `capabilityTag` | `workerDecisionEntry.capabilityTag` |
| `trustDimension` | `SocTrustDimensions.TRIAGE_ACCURACY` or `.CONTAINMENT_APPROPRIATENESS` |
| `confidence` | `1.0` |
| `evidence` | `"analystOutcome=" + analystOutcome` (audit trail) |
| `occurredAt` | `clock.instant()` |

**Idempotency:** Check `LedgerEntryRepository.findAttestationsByEntryId(entryId, tenancyId)` — filter returned list for matching `trustDimension` in code. If match exists, skip. This is a best-effort TOCTOU guard — acceptable for v1 since CDI event replay is rare and duplicate attestations cause proportional (not catastrophic) trust score skew. A database unique constraint on `(ledger_entry_id, trust_dimension)` is deferred (file as platform issue on casehub-ledger).

### 5. Routing (no SOC code)

`TrustWeightedImplementationRoutingStrategy` in `casehub-engine-ledger` implements `ImplementationRoutingStrategy` (`@Alternative @Priority(1)`). It reads `ActorTrustScore` and selects workers with higher trust. Once attestations flow, trust scores update via `IncrementalTrustUpdateObserver` (if enabled) or the nightly `TrustScoreJob`. No SOC-specific routing code is needed.

---

## Data Flow

```
Case completes (goal satisfied)
    │
    ▼
CaseOutcomeObserver.onOutcome(CaseOutcomeEvent)
    │  checks: caseType == INCIDENT_INVESTIGATION
    │  checks: outcomeLabel is success goal
    │  reads: caseFileSnapshot.analystOutcome, .analystId
    │
    ├─ CaseLedgerEntryRepository.findWorkerDecisionsByCaseId(caseId)
    │
    ├─ for each WorkerDecisionEntry:
    │     ├─ triage-accuracy attestation → saveAttestation(attestation, tenancyId)
    │     └─ containment-appropriateness attestation (if applicable)
    │
    ▼
LedgerEntryRepository.saveAttestation()
    │  fires: AttestationRecordedEvent (CDI)
    │
    ▼
IncrementalTrustUpdateObserver (casehub-ledger)
    │  recomputes: Bayesian Beta α/β for actor
    │
    ▼
ActorTrustScore updated → TrustWeightedImplementationRoutingStrategy (future cases)
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| No WorkerDecisionEntries for case | Log warning, return |
| `analystOutcome` missing from context | Fall back to inferring from `outcomeLabel`: resolved → SOUND, false-positive → FLAGGED, escalated → SOUND. Log at WARN level. Skip containment-appropriateness (cannot differentiate CONFIRM from DOWNGRADE) |
| `analystId` missing | Use `"system:soc-attestation"` with `ActorType.SYSTEM` |
| `saveAttestation` fails | Log error, continue to next worker. The failed attestation is permanently lost — there is no retry mechanism. Over many cases, intermittent failures could create positional bias (early-pipeline workers more likely to be attested). Acceptable for v1 |
| Duplicate CDI event (replay) | Idempotency guard: check existing attestations before writing (best-effort) |
| LedgerEntry not found for WorkerDecisionEntry | `saveAttestation` throws IllegalArgumentException — catch and log, skip this entry |

---

## Testing Strategy

| Level | What | How |
|---|---|---|
| Unit | `SocTrustDimensions` and `SocCaseCapabilities` constants exist | Plain JUnit |
| Unit | Verdict mapping logic — all 4 outcomes × 3 capabilities | Plain JUnit, parameterized |
| Unit | Idempotency guard — skip when attestation already exists | Mock repositories |
| Unit | Fallback when `analystOutcome` missing — infer from outcomeLabel | Mock event with null outcome |
| Unit | attestorId/attestorType fallback logic | Mock event with null analystId |
| Integration | Full attestation flow — case outcome → attestation persisted | `@QuarkusTest` with in-memory ledger |
| Integration | YAML output mapping preserves `analystOutcome` and `analystId` | `@QuarkusTest` with case lifecycle |

---

## Files Changed

| File | Change |
|---|---|
| `api/.../domain/SocTrustDimensions.java` | New — trust dimension constants |
| `api/.../domain/SocCaseCapabilities.java` | New — case-YAML capability name constants |
| `app/.../engine/SocAttestationService.java` | New — CaseOutcomeObserver implementation |
| `app/src/main/resources/soc/incident-investigation.yaml` | Add `analystOutcome`, `analystId` to outputMapping |
| `api/src/test/.../domain/SocTrustDimensionsTest.java` | New |
| `api/src/test/.../domain/SocCaseCapabilitiesTest.java` | New |
| `app/src/test/.../engine/SocAttestationServiceTest.java` | New |
