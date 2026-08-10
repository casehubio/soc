# HANDOFF — casehub-soc

**Date:** 2026-08-10
**Branch:** `issue-21-trust-cbr-compliance` (slot 106)
**Epic:** #21 — Trust, CBR & Compliance (Layers 4-5)

---

## Last session

**Issue #22 (Layer 4a: Trust dimensions & attestation routing) — CLOSED**

Delivered trust attestation on case resolution. Three new source files:

- `SocTrustDimensions` (api/) — two evaluable dimensions: `triage-accuracy`, `containment-appropriateness`
- `SocCaseCapabilities` (api/) — case-YAML capability name constants, distinct from `SocCapabilities` agent-registration tags
- `SocAttestationService` (app/) — `CaseOutcomeObserver` that writes `LedgerAttestation` per `WorkerDecisionEntry`

YAML output mapping updated: `analystOutcome` and `analystId` added to `analyst-review` binding.

Key design decisions: 2 dimensions not 4 (only evaluable ones), DOWNGRADE is SOUND for triage but FLAGGED for containment, per-worker attestation not per-case.

16 unit tests. Branch pushed. Issue #22 closed on GitHub.

---

## What's next

| Issue | Title | Depends on | Status |
|-------|-------|-----------|--------|
| #23 | Layer 4b: CBR integration & incident lifecycle | #22 (done) | OPEN |
| #24 | Layer 5: Compliance & audit evidence | #22, #23 | OPEN |

Run `/work` to continue on this branch with #23.

---

## State

| Item | Status |
|------|--------|
| Branch | `issue-21-trust-cbr-compliance` — 3 commits ahead of main |
| #22 | Closed |
| #23, #24 | Open |
| Build | passing (16 new tests, all green) |
| Slot 106 | Active — 2 issues remaining |
