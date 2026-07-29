# Next Steps — casehub-soc

**Updated:** 2026-07-30
**Delivery plan:** `ARC42STORIES.MD` (vertical slices with layers)

---

## Current State

### Slice 0: Domain Vocabulary — Complete
Domain types (AlertSeverity, ATT&CK, IOC, SocActionType), SiemAlertGanglion, case/situation YAML, SocActionRiskClassifier, SocCaseHub. 45+ tests.

### Slice 1, Layer 1: Alert Ingestion & Case Creation — Complete
- RAS pipeline wired end-to-end: CloudEvent → SiemAlertGanglion → SituationEvaluator → CaseTrigger → CaseInstance
- `SocGanglionProducer` — CDI producer for SiemAlertGanglion (api/ is pure Java)
- `SocCaseInputContributor` — converts RAS detections to serializable alert context
- `ras-situations.yaml` — fixed to current RAS API (`triggerAction`, correct `caseVersion`)
- Integration tests prove pipeline and case context seeding (33 tests green)

### Platform Issues Fixed Along the Way
- `SiemAlertGanglionTest` — removed stale `Uni<>.await().indefinitely()` calls (virtual threads migration)
- `SocActionRiskClassifier` — updated for `GateRequired` QuorumConfig parameter
- `json-schema-validator` version convergence between casehub-work and casehub-worker
- `soc-brute-force` situation deferred to Slice 2 (ganglion not yet implemented)

---

## What's Next

| Layer | Description | Scale | Complexity | Status |
|-------|-------------|-------|------------|--------|
| **Layer 2** | Triage workers (rule + LLM) | L | High | Next |
| Layer 3 | Analyst review & SLA | M | Med | After Layer 2 |
| Layer 4a | Trust & routing | M | Med | After Layer 3 |
| Layer 4b | CBR & incident lifecycle | M | High | After Layer 4a |
| Layer 5 | Compliance & audit | L | High | After Layer 4b |

### Layer 2 Key Tasks
- 6 named Worker beans (rule + LLM for each of 3 capabilities)
- Case YAML dual-bindings per capability for routing
- Blocking `AgentProvider` adapter for LLM workers
- `SocAgentRegistrar` for agent fleet in `AgentRegistry`

See `ARC42STORIES.MD` for full layer details and the workspace spec at `specs/slice-1-siem-critical-alert/2026-07-29-slice-1-design.md` for implementation design.

---

## Platform Gaps

| Gap | Issue | Impact |
|-----|-------|--------|
| Drools CEP | engine#809 | Blocks Slice 3 |
| Multi-approver OversightGate | engine#810 | Layer 3 single-approver workaround |
| Durable EventStore | pages#256 | Production deployment |
| Engine ObjectMapper lacks JSR310 | — | Worked around with SocCaseInputContributor |
