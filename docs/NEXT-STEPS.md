# Next Steps — casehub-soc

**Updated:** 2026-08-03
**Delivery plan:** `ARC42STORIES.MD` (vertical slices with layers)

---

## Current State

### Slice 0: Domain Vocabulary — Complete
Domain types (AlertSeverity, ATT&CK, IOC, SocActionType), SiemAlertGanglion, case/situation YAML, SocActionRiskClassifier, SocCaseHub. 45+ tests.

### Slice 1, Layer 1: Alert Ingestion & Case Creation — Complete
- RAS pipeline wired end-to-end: CloudEvent → SiemAlertGanglion → SituationEvaluator → CaseTrigger → CaseInstance
- `SocGanglionProducer` — CDI producer for SiemAlertGanglion (api/ is pure Java)
- `SocCaseInputContributor` — converts RAS detections to serializable alert context

### Slice 1, Layer 2: Triage Workers — Complete
- 6 workers (2 per capability): rule-based + LLM for IOC enrichment, ATT&CK mapping, containment recommendation
- Wired via `SocCaseHub.augment()` with `SocInvestigationCaseDescriptor` (plain POJO)
- Shared capability output contracts in api/ (`IocEnrichmentOutput`, `AttckMappingOutput`, `ContainmentRecommendationOutput`)
- Rule-based workers: `IocExtractor` (regex), `AttckLookupTable`, `ContainmentDecisionMatrix` (with `PlannedAction`)
- LLM workers: `AgentWorkerFunction` (IOC/ATT&CK), `WorkerFunction.Sync` (containment — engine#829 workaround)
- LLM workers register with `noFunction()` when `langchain4j-anthropic` unavailable
- Bootstrap routing selects rule-based by convention (insertion order). 89 tests green.

---

## What's Next

| Layer | Description | Scale | Complexity | Status |
|-------|-------------|-------|------------|--------|
| **Layer 3** | Analyst review & SLA + failure binding | M | Med | Next |
| Layer 4a | Trust & routing + agent descriptors | M | Med | After Layer 3 |
| Layer 4b | CBR & incident lifecycle | M | High | After Layer 4a |
| Layer 5 | Compliance & audit | L | High | After Layer 4b |

### Layer 3 Key Tasks
- ~~Investigation failure binding via `CaseOutcomeObserver` SPI (soc#19)~~ **Done** — `SocFaultedCaseReviewCreator` creates failure-review WorkItem when case FAULTs. Blocked by engine#846 (now fixed).
- Analyst review WorkItem with SLA enforcement (`SocSlaBreachPolicy`)
- Containment approval gate via `SocActionRiskClassifier` + `OversightGateService`
- `SocAgentRegistrar` for agent descriptors in `AgentRegistry` (soc#20 — enables trust routing in Layer 4a)

---

## Platform Gaps

| Gap | Issue | Impact |
|-----|-------|--------|
| Agent.plannedActionExtractor | engine#829 | Enables uniform AgentWorkerFunction for containment LLM worker |
| Worker reroute on failure | — | Engine infra exists but exclusion list writer missing |
| Drools CEP | engine#809 | Blocks Slice 3 |
| ~~Multi-approver OversightGate~~ | ~~engine#810~~ | ~~Resolved — multi-approver landed~~ |
| Durable EventStore | pages#256 | Production deployment |
| langchain4j-anthropic runtime | — | LLM workers register with noFunction() until added |
