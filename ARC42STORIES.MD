# casehub-soc — Arc42 Stories

**Date:** 2026-07-29 (rewritten from 2026-06-29 original)
**Status:** Epic 1 complete. Platform audit complete. Vertical slice approach adopted.
**Platform audit:** 2026-07-29 — pages (13 packages), blocks-ui (29 components), blocks (agentic orchestration), engine (unified execution model, virtual threads)

This document defines the full delivery plan for casehub-soc. The approach is **vertical slices built layer by layer** — each slice delivers one incident scenario end-to-end, with UI components wired alongside each backend feature. No separate dashboard epic.

---

## Vision Statement

Build a Security Operations Center application on the CaseHub agentic harness that demonstrates:
1. **Dual-agent incident response** — rule-based and LLM agents coexist from day one, routed by `ImplementationRoutingStrategy` trust scores (five-phase maturity: Bootstrap, Qualified, Borderline, Excluded-2B, Excluded-3)
2. **CBR-integrated triage** — past incidents inform future triage as part of the core flow, not a bolt-on
3. **Tamper-evident compliance** — SOC2/DORA/NIS2 evidence generated as a byproduct of normal operation
4. **Growing application shell** — blocks-ui components compose into a working SOC operator view that grows with each layer
5. **Adaptive containment governance** — irreversible actions gated by risk classification and human oversight

---

## Architecture Decisions

**Vertical slices, not sequential epics.** The original plan had 11 sequential epics (triage, then enrichment, then containment, then trust, then CBR, then dashboard...). The platform has matured enough that these concerns can be delivered together within a single incident scenario. Each slice delivers a working end-to-end flow.

**UI is not a separate phase.** blocks-ui has 29 ready-made components (work-item-workbench, sla-indicator, approval-gate, trust-score-panel, audit-trail-viewer, channel-activity, etc.). These get wired as each backend feature lands. The application shell grows incrementally — no "Epic 8: Dashboard" deferred to the future.

**Both worker types from the start.** Rule-based and LLM workers registered as separate named `Worker` beans, with separate bindings in the case YAML for each capability. `ImplementationRoutingStrategy` (landed — trust-weighted, five-phase maturity model) selects which binding(s) to fire based on trust scores. CDI `@DefaultBean`/`@Alternative` is NOT used for worker selection — that pattern is all-or-nothing displacement, not dual-candidate routing. The routing operates at the binding level: two bindings per capability, each referencing a different named worker.

**CBR baked in.** `CbrCaseMemoryStore` retain on case resolution, retrieve on new alert. `CbrCaseTypeRegistration` CDI extension point makes SOC incident types first-class CBR citizens. Not a separate epic — part of the incident lifecycle from the start.

**LLM workers need a blocking adapter.** `AgentProvider.invoke()` returns `Multi<AgentEvent>` (Mutiny reactive stream). LLM workers wrap this with a blocking adapter that collects the stream to a completed result — straightforward with virtual threads but must be explicit.

**Blocking APIs only.** Platform has completed the virtual threads migration (ADR-0005). All SOC code uses blocking APIs — no Mutiny, no `Uni<>`, no reactive SPIs.

**Incidents are CaseInstances.** No separate entity types. Alerts are CloudEvents routed through RAS. Incidents are CaseInstances created by RAS situation triggers. Investigation state lives in CaseContext.

---

## Slice Overview

| Slice | Scenario | Layers | Status |
|-------|----------|--------|--------|
| 0 | Domain Vocabulary & Platform Integration | — | **Done** (Epic 1) |
| 1 | SIEM Critical Alert — full investigation | 5 layers | Next |
| 2 | Brute Force Detection | Extends Slice 1 infrastructure | After Slice 1 |
| 3 | Real-Time Event Correlation | Drools CEP integration | Future (engine#809) |
| 4 | Multi-Tenant SOC-as-a-Service | Tenant isolation | Future |

**MVP = Slices 0 + 1.** A complete incident response pipeline for SIEM critical alerts: alert arrives → RAS detects → case created → dual-agent investigation (rule + LLM) → analyst review with SLA → containment approval → case resolves → trust updated → CBR retained → compliance evidence generated. Working application shell throughout.

---

## Slice 0: Domain Vocabulary & Platform Integration ✅

Delivered as Epic 1 on branch `epic-1-domain-model`. See the detailed story breakdown below — all 10 stories complete with 45+ tests.

### What Was Delivered

- **Domain vocabulary** (api/): AlertSeverity, AttackTactic, AttackTechnique, Ioc, IocType, SocActionType (9 containment actions with gate policies), SocGroups, SocCapabilities
- **SIEM alert Ganglion** (api/): SiemAlertGanglion — classifies 6 CloudEvent types by severity → detection signal
- **Case definition** (app/): `incident-investigation.yaml` — 3 capabilities (ioc-enrichment, attck-mapping, containment-recommendation), 4 bindings (sequential context-change), 3 success goals, analyst review human task
- **Situation definitions** (app/): `ras-situations.yaml` — soc-siem-alert-critical (threshold chain, 0.8 confidence) and soc-brute-force (count chain, 10 events in 5 min)
- **Risk classifier** (app/): SocActionRiskClassifier — gate policies (NEVER/ALWAYS/RISK_SCORE_THRESHOLD/CONFIDENCE_THRESHOLD), fail-closed on missing context

### What Was Removed

SecurityAlert entities, JPA persistence, Flyway migrations, webhook endpoints, CDI observers — all deleted after platform review revealed they duplicated RAS, CaseContext, and platform-streams capabilities.

### Platform Gaps Discovered

- `SituationStore` implementation missing — filed as parent#398

---

## Slice 1: SIEM Critical Alert — Full Investigation

The primary vertical slice. A CRITICAL/HIGH SIEM alert triggers an incident investigation through the full lifecycle. Built in 5 layers, each adding depth while keeping the flow working end-to-end.

### Layer 1 — Alert Ingestion & Case Creation

**Goal:** CloudEvent arrives → SiemAlertGanglion classifies → RAS situation threshold met → CaseInstance created with investigation context.

**What gets built:**
- RAS integration wiring — connect SiemAlertGanglion to `SituationEvaluator` runtime
- Case creation pipeline — `SituationEvaluator` matches `TriggerAction.CreateCase` → `CaseTrigger.fire(config, context)` → `CaseHub.startCase()` creates CaseInstance from `incident-investigation.yaml` with `baseCaseData` (priority, source) seeded from situation YAML
- Application shell scaffold — Quarkus-served page with `loadSite()`, minimal layout with incident list using `<blocks-case-explorer>`

**Platform capabilities:**
- `casehub-ras`: SituationEvaluator (runtime), SituationStore (api — `InMemorySituationStore` exists in `ras/persistence-memory/`, `JpaSituationStore` in `ras/persistence-jpa/`)
- `casehub-engine`: CaseHubRuntime, CaseInstance creation
- `casehub-pages`: loadSite(), pages-runtime, pages-push-runtime (SSE for live incident updates)
- `casehub-blocks-ui`: `<blocks-case-explorer>` for incident list

**Acceptance:**
- Integration test: send CloudEvent with CRITICAL severity → Ganglion returns DETECTED/0.95 → situation threshold met → CaseInstance created with priority=HIGH
- Application shell renders incident list with live updates

**Note:** `SituationStore` interface, `InMemorySituationStore`, and `JpaSituationStore` all exist in casehub-ras. parent#398 may be stale — verify before treating Layer 1 as blocked.

---

### Layer 2 — Triage Workers (Rule-Based + LLM)

**Goal:** Three capability workers execute the investigation pipeline. Each has rule-based and LLM implementations, routed by `ImplementationRoutingStrategy`.

**What gets built:**

**IOC Enrichment workers (×2):**
- Rule-based: extract IOCs from CloudEvent data (IPs, hashes, domains from alert payload), tag by IocType, write to case context
- LLM: Claude agent analyses alert context, reasons about IOC significance, queries threat knowledge, produces enriched analysis

**ATT&CK Mapping workers (×2):**
- Rule-based: pattern-match IOC types and alert categories to ATT&CK techniques (lookup table), assign confidence
- LLM: Claude agent reasons about attack narrative, maps to ATT&CK with natural language rationale

**Containment Recommendation workers (×2):**
- Rule-based: severity + ATT&CK tactic → recommended action from SocActionType taxonomy, risk score from rules
- LLM: Claude agent considers full investigation context, recommends containment with reasoned rationale, returns PlannedAction

**Agent descriptors:**
- Register SOC agent fleet in `AgentRegistry` (eidos): `rule:ioc-enrichment`, `claude:ioc-enrichment@v1`, `rule:attck-mapping`, `claude:attck-mapping@v1`, `rule:containment-recommender`, `claude:containment-recommender@v1`

**Routing:**
- Both workers registered as separate named `Worker` beans (NOT `@DefaultBean`/`@Alternative` — CDI displacement is all-or-nothing)
- Two bindings per capability in case YAML, each referencing a different worker name
- `ImplementationRoutingStrategy` selects which binding(s) to fire — five-phase trust maturity (Bootstrap: `RunAll()` fires both; Qualified: trust-scored selection; Borderline/Excluded: filtered)
- Workers follow `FlowWorkerFunction` pattern with `Map<String, Object>` I/O (AML convention)
- LLM workers wrap `AgentProvider.invoke()` (returns `Multi<AgentEvent>`) with a blocking adapter

**Application shell additions:**
- `<blocks-channel-activity>` showing investigation progress on /work and /observe channels
- Investigation detail view with context data

**Platform capabilities:**
- `casehub-worker`: Worker, FlowWorkerFunction, Capability
- `casehub-engine`: ImplementationRoutingStrategy (trust-weighted, five-phase maturity)
- `casehub-eidos`: AgentDescriptor, AgentRegistry
- `casehub-platform`: AgentProvider (Claude sessions for LLM workers)
- `casehub-qhorus`: /work channel dispatch, /observe channel for findings
- `casehub-blocks-ui`: `<blocks-channel-activity>`, `<blocks-channel-feed>`

**Acceptance:**
- Unit tests for each worker (6 workers × diverse scenarios)
- Integration test: case context triggers IOC enrichment → triggers ATT&CK mapping → triggers containment recommendation → case context populated with full investigation
- Both rule-based and LLM workers produce valid results
- Routing selects rule-based by default (Bootstrap trust), LLM when trust matures

---

### Layer 3 — Analyst Review & SLA

**Goal:** Human analyst reviews investigation findings, approves/rejects containment, with SLA enforcement and escalation.

**What gets built:**

**Analyst review WorkItem:**
- Fires after containment recommendation completes (from case YAML binding)
- Candidate groups: `soc-tier2-analyst`
- Outcomes: CONFIRM_SEVERITY, DOWNGRADE, ESCALATE, FALSE_POSITIVE
- Rich context: IOC findings, ATT&CK mapping, containment recommendation, CBR similar incidents (from Layer 4)
- Sets `analystDecision` in case context → resolves case goal

**SLA breach policy:**
- `SocSlaBreachPolicy implements SlaBreachPolicy`
- Chained escalation:

| Priority | Claim SLA | Completion SLA | Breach Action |
|----------|-----------|----------------|---------------|
| P1 | 5 min | 15 min | Escalate → SOC manager, deadline +30 min |
| P2 | 15 min | 1 hr | Escalate → senior analyst, deadline +2 hr |
| P3 | 1 hr | 24 hr | Extend +12 hr, then escalate |
| P4 | 4 hr | 72 hr | Extend +24 hr, then fail |

**Containment approval gate:**
- SocActionRiskClassifier (done in Slice 0) gates containment actions
- Single-approver via OversightGateService for now
- M-of-N multi-approver when engine#810 lands (connector between ActionRiskClassifier and work's M-of-N WorkItemSpawnGroup)

**Application shell additions:**
- `<blocks-work-item-workbench>` — analyst inbox with incident queue
- `<blocks-sla-indicator>` — countdown timers on active WorkItems
- `<blocks-sla-breach-policy>` — escalation chain visualisation
- `<blocks-approval-gate>` — containment approval UI (QuorumConfig ready for M-of-N when engine#810 lands)
- `<blocks-notification-inbox>` — analyst alerts

**Platform capabilities:**
- `casehub-work`: WorkItem, SlaBreachPolicy, WorkItemLifecycle
- `casehub-work-engine-adapter`: HumanTaskTarget (in engine-api), OversightGateService
- `casehub-blocks-ui`: work-item-workbench, sla-indicator, sla-breach-policy, approval-gate, notification-inbox

**Binding failure handling:**
- If a worker fails in Layer 2, the binding chain stalls (subsequent `when` guards never become true)
- Add a failure binding that fires on error state — ensures the case always reaches a human even when the automated pipeline breaks

**Acceptance:**
- WorkItem created with correct SLA window based on priority
- Analyst completes with outcome → case context updated → case advances
- SLA breach fires → escalation to correct groups → new deadline set
- Containment recommendation with GatePolicy.ALWAYS → approval WorkItem created
- Application shell shows full analyst workspace

---

### Layer 4a — Trust & Routing

**Goal:** Agent performance tracked via trust scores. Routing selects best-performing workers.

**What gets built:**

**Trust dimensions:**
- `triage-accuracy` — was severity classification correct?
- `investigation-thoroughness` — were all relevant IOCs identified?
- `containment-effectiveness` — did containment stop the threat?
- `false-positive-rate` — how often does this agent raise false alarms?

**Incident resolution attestation:**
- At case resolution, analyst attests to triage quality: SOUND or FLAGGED
- `LedgerAttestation` written → trust score updated (Bayesian Beta incremental)
- `CommitmentAttestationPolicy` translates commitment outcomes to attestation verdicts

**Trust routing activation:**
- `casehub-engine-ledger` on classpath → `TrustWeightedAgentStrategy` active at Priority 1
- Routes investigation tasks to agents with highest trust for relevant ATT&CK tactic
- Cold start: Beta(1,1) = 0.5 prior via `TrustScoreComputer` (inherent in Bayesian prior — no separate bootstrap source needed for basic cold start; `TrustBootstrapSource` available for cross-deployment trust import)

**Application shell additions:**
- `<blocks-trust-score-panel>` — agent trust scores by ATT&CK tactic
- `<blocks-trust-workbench>` — trust management view
- `<blocks-routing-rationale>` — why this agent was selected

**Platform capabilities:**
- `casehub-ledger`: Bayesian Beta trust scoring (TrustScoreSource, TrustScoreComputer), LedgerAttestation (AttestationVerdict: SOUND/FLAGGED/ENDORSED/CHALLENGED)
- `casehub-engine-ledger`: TrustWeightedAgentStrategy, TrustWeightedImplementationRoutingStrategy
- `casehub-eidos`: AgentRegistry, CapabilityHealth probes

**Acceptance:**
- Attestation at case resolution → trust score updated
- Second incident → routing considers trust from first incident
- Five-phase trust maturity correctly classifies agents

---

### Layer 4b — CBR & Incident Lifecycle

**Goal:** Past incidents inform future triage. Incident lifecycle state visible and enforced.

**What gets built:**

**CBR retain:**
- At case resolution: write `CbrCaseMemoryStore` entry with problem (IOCs, ATT&CK, severity, source), solution (containment actions, playbook), outcome (true/false positive, dwell time)
- `CbrCaseTypeRegistration` CDI extension registers SOC incident type
- Feature vector: alert_type, source_system, attck_techniques, ioc_types, severity_outcome, containment_success, false_positive
- Observe `CaseLifecycleEvent` (filter on completed goals), not a fabricated event type

**CBR retrieve:**
- At case creation (Layer 1 pipeline): query `CbrCaseMemoryStore` for similar past incidents
- Top-k results injected into case context as `retrievedIncidents`
- Triage workers (Layer 2) use retrieved incidents as context for severity recommendation
- LLM worker prompt includes "Based on N similar past incidents..."
- Progressive enhancement: Layer 1 works without it, Layer 4b adds it as optional context enrichment

**Incident lifecycle:**
- State tracking via case context: DETECTED → TRIAGING → INVESTIGATING → CONTAINING → RESOLVED/ESCALATED/FALSE_POSITIVE
- Leverage case YAML sequential binding guards for ordering enforcement (not a separate state machine)
- `CaseLifecycleEvent` observation for downstream CDI consumers (push, ledger, CBR)

**Containment rollback:**
- Design the rollback path for reversible containment actions (`SocActionType.reversible()`)
- Rollback WorkItem with SOC manager authorization
- Rollback LedgerEntry recording the undo action with `causedByEntryId` → original containment

**Application shell additions:**
- `<blocks-timeline>` — incident timeline with investigation steps
- `<blocks-similarity-panel>` — CBR retrieved similar incidents
- `<blocks-kpi-metric-row>` — SOC operational metrics (open incidents, MTTR, false positive rate)

**Platform capabilities:**
- `casehub-neocortex`: CbrCaseMemoryStore (retain/retrieve), CbrCaseTypeRegistration (engine-api CDI extension)
- `casehub-engine`: CaseLifecycleEvent for lifecycle observation
- `casehub-blocks-ui`: blocks-timeline, similarity-panel, kpi-metric-row

**Acceptance:**
- CBR retain on resolution → retrieve on next alert returns similar incident
- LLM triage worker includes retrieved incidents in reasoning
- Incident lifecycle states transition correctly via binding guards
- Reversible containment actions have documented rollback path
- Application shell shows timeline, similar incidents, KPIs

---

### Layer 5 — Compliance & Audit

**Goal:** Tamper-evident audit trail for the full incident lifecycle. Compliance evidence generated automatically.

**What gets built:**

**LedgerEntry subclasses:**

| Entry Type | Records | causedByEntryId links to |
|------------|---------|--------------------------|
| `AlertTriageLedgerEntry` | Alert received, severity assigned | Stream ingestion event |
| `IncidentPromotedLedgerEntry` | Alert promoted to incident | AlertTriageLedgerEntry |
| `InvestigationStepLedgerEntry` | Agent performed investigation action | Previous investigation step |
| `ContainmentDecisionLedgerEntry` | Containment approved/rejected | Human WorkItem completion |
| `ContainmentExecutedLedgerEntry` | Containment action executed | ContainmentDecisionLedgerEntry |
| `IncidentResolvedLedgerEntry` | Incident closed with outcome | Final investigation step |

All entries linked via `causedByEntryId` — full decision provenance from alert to resolution.

**Merkle inclusion proofs:**
- Endpoint for auditors to verify containment decisions are unaltered
- `LedgerVerificationService` with MMR (RFC 9162)

**Compliance evidence:**
- DORA response time report: time from alert → triage → investigation → containment → resolution, SLA compliance %
- SOC2 Type II: all containment actions have approval records, all decisions attributed, all tamper-evident
- SOC-specific evidence queries against ledger entries (no `EvidenceCollector` SPI exists in platform — compliance evidence collection is new work, built from `ComplianceSupplement` data model and ledger queries)

**GDPR:**
- Art.17 erasure: `DecisionContextSanitiser` strips SOC-specific PII (IPs, emails, names)
- Art.22 decision records: automated triage decisions carry rationale, confidence, right to contest

**Application shell additions:**
- `<blocks-audit-trail-viewer>` — full decision chain for any incident
- `<blocks-compliance-summary>` — SOC2/DORA compliance dashboard
- `<blocks-gdpr-erasure-action>` — erasure workflow UI

**Platform capabilities:**
- `casehub-ledger`: JpaLedgerEntry subclasses (JOINED inheritance, `domainContentBytes()` override), Merkle MMR, `inclusionProof(entryId, tenancyId)`, GDPR erasure
- `casehub-ledger`: ComplianceSupplement for GDPR Art.22 decision records
- `casehub-blocks-ui`: audit-trail-viewer, compliance-summary, gdpr-erasure-action

**Note:** `casehub-ops` EvidenceCollector does not exist. Compliance evidence collection is SOC-built from ledger queries. Propose `EvidenceCollector` SPI to parent as a follow-on platform contribution.

**Acceptance:**
- Every investigation action creates a LedgerEntry with causal chain
- Auditor can request and verify Merkle inclusion proof for any containment decision
- DORA response time report generates from ledger timestamps
- GDPR erasure strips PII, preserves structural audit trail, writes ErasureReceipt

---

## Slice 2: Brute Force Detection

Extends Slice 1 infrastructure with count-based detection. The RAS situation `soc-brute-force` (already defined in Slice 0) fires after 10 auth failures within 5 minutes.

**What's new vs Slice 1:**
- A `BruteForceGanglion` detector for `soc.auth.failure` events (simple counter, not severity-based)
- Same investigation flow (ioc-enrichment → attck-mapping → containment-recommendation → analyst review) but calibrated for credential access scenarios
- ATT&CK mapping targets `CREDENTIAL_ACCESS` tactic specifically
- Containment recommendation skewed toward `DISABLE_USER_ACCOUNT` and `ROTATE_API_KEY`
- Lower priority (MEDIUM) — different SLA windows
- CBR retrieval returns brute-force-specific past incidents

**Mostly exercises existing infrastructure.** The workers, SLA, trust, CBR, and compliance layers from Slice 1 handle this scenario with minimal new code. The value is proving the architecture handles diverse incident types.

---

## Slice 3: Real-Time Event Correlation (Future)

**Depends on:** Drools CEP integration (engine#809)

Temporal pattern detection for multi-stage attacks:
- Reconnaissance + Initial Access within 1 hour → escalate
- Multiple failed logins + successful login + data exfiltration within 30 minutes → credential compromise
- Malware on multiple hosts within 15 minutes → lateral movement

SOC authors Drools DRL rules; the engine provides the CEP runtime. Detected situations feed into RAS `SituationStore`.

Also includes alert aggregation — 1000 identical firewall drops from same source → single incident, not 1000 WorkItems.

---

## Slice 4: Multi-Tenant SOC-as-a-Service (Future)

Full tenant isolation for managed SOC providers:
- Per-tenant EDR/SIEM configuration via `EndpointRegistry`
- Per-tenant SLA policies via `PreferenceKey` scope resolution
- PostgreSQL RLS via `casehub.rls.enabled=true`
- Per-tenant trust scores and agent pools
- Per-tenant compliance reporting

---

## Platform Gaps & Dependencies

| Gap | Issue | Impact | Status |
|-----|-------|--------|--------|
| ~~RAS SituationStore~~ | ~~parent#398~~ | ~~Closed — InMemory + JPA impls exist in ras repo~~ | **Resolved** |
| Multi-approver OversightGate | engine#810 | Layer 3 workaround (single-approver) | Filed |
| Drools CEP | engine#809 | Blocks Slice 3 | Filed |
| Durable EventStore | pages#256 | Production deployment | Filed |
| PlanAdapter real impl | engine#738 | Degrades CBR quality | Existing |
| Durable CaseContextStore | engine#732 | Production deployment | Existing |

**Not blocking any slice:** Agent memory/personality (engine#800, #790) — advanced features for future enhancement.

---

## Application Shell Architecture

The SOC application shell is a Quarkus-served page using `loadSite()` from casehub-pages. It composes blocks-ui web components into a SOC operator workspace. The shell grows with each layer:

| Layer | Components Added |
|-------|-----------------|
| 1 | `case-explorer` (incident list with live updates) |
| 2 | `channel-activity`, `channel-feed` (investigation progress) |
| 3 | `work-item-workbench`, `sla-indicator`, `sla-breach-policy`, `approval-gate`, `notification-inbox` |
| 4a | `trust-score-panel`, `trust-workbench`, `routing-rationale` |
| 4b | `blocks-timeline`, `similarity-panel`, `kpi-metric-row` |
| 5 | `audit-trail-viewer`, `compliance-summary`, `gdpr-erasure-action` |

**Data contracts:** REST endpoints serve JSON consumed by blocks-ui `DataSourceMixin`. SSE via `pages-push-runtime` for live updates.

**Theme:** OKLCH casehub-dark via `pages-ui-tokens`.

**Consumption:** `casehub-blocks-ui-npm` Maven artifact + `casehub-pages-ui-static` Maven artifact.

---

## Superseded Issues

The following issues from the original Epic 2 breakdown are superseded by the vertical slice approach. They will be closed and replaced with new issues aligned to the layer structure.

| Old Issue | Title | Replaced By |
|-----------|-------|-------------|
| #8 | Epic 2: Incident Triage & Case Lifecycle | Slice 1 (all layers) |
| #9 | Alert-to-case promotion via RAS situations | Layer 1 |
| #10 | Rule-based triage agent (WorkerFunction) | Layer 2 |
| #11 | Analyst WorkItem for triage review | Layer 3 |
| #12 | SLA breach policy — SOC escalation chain | Layer 3 |
| #13 | Incident lifecycle state management | Layer 4 |

---

## Open Research Questions

### Trust Granularity
- Trust per ATT&CK tactic (14 dimensions) or per technique (200+)? Start with tactics — refine if routing quality demands it.
- Cold start: Beta(1,1) = 0.5 prior. How many incidents before routing meaningfully differentiates? Need simulation.

### CBR Representation
- Which `CaseMemoryStore` backend? Start with JPA FTS (structured queries by ATT&CK + IOC type). Graduate to Mem0 (vector) when "alerts similar to this description" is needed.
- Concept drift: recent incidents weighted higher. Configurable decay via `PreferenceKey`.

### LLM Worker Boundaries
- How much context to include in LLM worker prompts? Full case context vs summary?
- CRAG + NLI faithfulness checking for LLM investigation outputs?
- Cost management: which scenarios justify LLM vs rule-based?

### Containment
- M-of-N approval semantics when engine#810 lands — threshold per action type?
- Containment rollback is designed in Layer 4b — reversible actions get a rollback WorkItem path

### Enrichment Feeds
- Which threat feeds to integrate first? VirusTotal (commercial), OTX (free), MISP (self-hosted)?
- How to handle conflicting intelligence (Feed A says malicious, Feed B says benign)?

---

## Delivery Sequence

```
Slice 0 ✅ Domain Vocabulary (AlertSeverity, ATT&CK, IOC, SocActionType, Ganglion, Case YAML)
    │
    └── Slice 1: SIEM Critical Alert
        ├── Layer 1: Alert Ingestion & Case Creation ──── (not blocked — SituationStore available)
        ├── Layer 2: Triage Workers (Rule + LLM) ──────── (after Layer 1)
        ├── Layer 3: Analyst Review & SLA ─────────────── (after Layer 2)
        ├── Layer 4a: Trust & Routing ─────────────────── (after Layer 3)
        ├── Layer 4b: CBR & Incident Lifecycle ────────── (after Layer 4a)
        └── Layer 5: Compliance & Audit ───────────────── (after Layer 4b)
            │
            ├── Slice 2: Brute Force Detection ────────── (extends Slice 1)
            │
            ├── Slice 3: Event Correlation ────────────── (depends: engine#809 Drools CEP)
            │
            └── Slice 4: Multi-Tenant ────────────────── (after all)
```

Each layer produces a working system. Layer 1 alone creates incidents from alerts. Layers 1+2 add automated investigation. Layers 1+2+3 add human oversight. And so on. The system is usable at every checkpoint.
