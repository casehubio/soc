# casehub-soc -- Consumer Guide

> Security Operations Center application -- multi-agent cyber incident response with trust-weighted triage, CBR-based incident correlation, and compliance evidence for SOC2, DORA, and NIS2.

**GitHub:** [casehubio/soc](https://github.com/casehubio/soc)
**Tier:** Application
**Version:** 0.2-SNAPSHOT

---

## Purpose

Multi-agent cyber incident response built on the CaseHub platform foundation. A SIEM/EDR alert arrives as a CloudEvent, flows through the RAS detection pipeline (`SiemAlertGanglion`), triggers an incident investigation case, and is investigated by dual rule-based and LLM workers -- all coordinated by the adaptive case engine.

This is an **application layer**, not a framework. The foundation provides coordination, accountability, audit, and compliance primitives. casehub-soc provides the cyber incident response domain logic on top.

---

## Module Structure

| Module | Artifact | Type | Purpose |
|---|---|---|---|
| `api/` | `casehub-soc-api` | Pure-Java SPI (no Quarkus, no JPA) | Domain model, SPI interfaces, capability tags, worker output contracts, RAS Ganglion |
| `app/` | `casehub-soc-app` | Quarkus application | Workers, case engine wiring, risk classifier, RAS producers, failure-review WorkItem creator |

**Maven coordinates:**
```xml
<dependency>
  <groupId>io.casehub</groupId>
  <artifactId>casehub-soc-api</artifactId>
  <version>0.2-SNAPSHOT</version>
</dependency>
```

---

## Current Implementation State

| Layer | Status | What It Delivers |
|---|---|---|
| Slice 0: Domain Vocabulary | Complete | AlertSeverity, ATT&CK taxonomy, IOC types, SocActionType (9 actions), SocGroups, SocCapabilities, SiemAlertGanglion, case YAML, situation YAML, SocActionRiskClassifier |
| Slice 1, Layer 1: Alert Ingestion & Case Creation | Complete | CloudEvent to SiemAlertGanglion to SituationEvaluator to CaseTrigger to CaseInstance pipeline |
| Slice 1, Layer 2: Triage Workers | Complete | 6 workers (rule-based + LLM for IOC enrichment, ATT&CK mapping, containment recommendation) |
| Slice 1, Layer 3: Failure Review | Partial | SocFaultedCaseReviewCreator creates WorkItems for FAULTED investigations; analyst review and SLA next |
| Slice 1, Layers 4-5 | Planned | Trust routing, CBR, compliance audit trail |
| Web Application Phase 0 | Complete | Quinoa skeleton with sidebar navigation (Incidents, Workbench, Trust, Compliance) |
| Web Application Phase 1 | Complete | Incidents view — case-explorer, timeline, KPIs, ATT&CK matrix, IOC panel, alert heatmap, SSE push |
| Web Application Phase 2 | Complete | Analyst Workbench — work-item-inbox, SLA indicator, approval gate, case notes, IOC submission |
| Web Application Phase 3 | Complete | Trust & Routing — fleet trust overview (6 agent cards), routing rationale (per-case), CBR similarity panel, SSE push |

---

## Web Application

The SOC web application is hosted via Quarkus Quinoa. TypeScript sources in `app/src/main/webui/`, compiled by esbuild, served from classpath. Single `mvn quarkus:dev` hot-reloads Java and TypeScript.

### REST Endpoints

| Endpoint | Method | Returns |
|---|---|---|
| `/api/soc/incidents` | GET | Incident list (`{ entities: [...], totalCount: N }`) |
| `/api/soc/incidents/{id}` | GET | Incident detail |
| `/api/soc/incidents/{id}/timeline` | GET | Investigation steps |
| `/api/soc/incidents/{id}/channels` | GET | Channel messages (stub) |
| `/api/soc/incidents/{id}/iocs` | GET | Extracted IOCs |
| `/api/soc/incidents/{id}/attck` | GET | ATT&CK technique mapping |
| `/api/soc/kpis` | GET | SOC operational KPIs |
| `/api/soc/alerts/heatmap` | GET | Alert volume by source/severity/time |
| `/api/soc/trust/{agentId}` | GET | Agent trust scores (global + dimensions) |
| `/api/soc/trust/fleet-kpis` | GET | Fleet aggregate metrics (mean trust, observations, size) |
| `/api/soc/trust/routing/{caseId}` | GET | Routing rationale per capability (from WorkerDecisionEntry) |
| `/api/soc/cbr/similar/{caseId}` | GET | Similar past incidents with outcome summary |
| `/api/soc/compliance/proof/{entryId}` | GET | Merkle inclusion proof |
| `/api/soc/compliance/timeline/{incidentId}` | GET | Ledger entry chain |
| `/api/soc/compliance/dora` | GET | DORA response time report |

### SSE Push Topics

| Topic | Events |
|---|---|
| `soc:incidents` | append (new), replace (status change) |
| `soc:kpis` | snapshot (refresh on state change) |
| `soc:trust` | snapshot (on TrustScoreActorUpdatedEvent) |

---

## Alert Ingestion Pipeline

The end-to-end flow from SIEM/EDR alert to case creation:

```
CloudEvent (soc.alert.siem.* / soc.alert.edr.*)
    |
    v
SiemAlertGanglion  --  classifies by severity (alertseverity extension)
    |                   CRITICAL -> DETECTED / 0.95
    |                   HIGH     -> DETECTED / 0.80
    |                   MEDIUM   -> WEAK / 0.50
    |                   LOW      -> WEAK / 0.20
    |                   INFO     -> NOISE
    v
SituationEvaluator  --  threshold chain mode (>= 0.8 confidence)
    |                    15-minute correlation window, 30-second buffer delay
    v
CaseTrigger.fire()  --  creates CaseInstance from incident-investigation.yaml
    |
    v
SocCaseInputContributor  --  converts RAS detections to serialisable alert context
```

**Supported CloudEvent types** (defined in `SiemAlertGanglion.EVENT_TYPES`):
- `soc.alert.siem.crowdstrike`
- `soc.alert.siem.splunk`
- `soc.alert.siem.sentinel`
- `soc.alert.edr.crowdstrike`
- `soc.alert.edr.sentinelone`
- `soc.alert.edr.carbonblack`

**CloudEvent extensions** read by the Ganglion:
- `alertseverity` -- maps to `AlertSeverity` enum (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL)
- `alertsource` -- source system identifier
- `alertrule` -- triggering rule name

---

## Investigation Pipeline

Once a case is created, the case definition YAML (`incident-investigation.yaml`) drives a sequential investigation pipeline via context-change bindings:

```
CaseInstance created with alert context
    |
    v
[1] ioc-enrichment  --  extract IOCs from alert data
    |                    when: .alert != null and .iocEnrichment == null
    v
[2] attck-mapping  --  map IOCs to MITRE ATT&CK techniques
    |                   when: .iocEnrichment != null and .attckMapping == null
    v
[3] containment-recommendation  --  recommend containment actions
    |                                when: .attckMapping != null and .containmentRecommendation == null
    v
[4] analyst-review  --  human task for tier-2 analyst
                        when: .containmentRecommendation != null and .analystDecision == null
                        candidateGroups: soc-tier2-analyst
                        expiresIn: PT4H
```

Each capability has **two worker implementations** -- rule-based and LLM:

| Capability | Rule-Based Worker | LLM Worker | Output Contract |
|---|---|---|---|
| `ioc-enrichment` | `RuleIocEnrichmentWorker` -- regex extraction via `IocExtractor` (IPv4, MD5, SHA1, SHA256, domain, URL, email, CVE) | `LlmIocEnrichmentWorker` -- `AgentWorkerFunction` with `IocEnrichmentOutput` response schema | `IocEnrichmentOutput` (iocs[], summary) |
| `attck-mapping` | `RuleAttckMappingWorker` -- `AttckLookupTable` with rule prefix + IOC type matching | `LlmAttckMappingWorker` -- `AgentWorkerFunction` with `AttckMappingOutput` response schema | `AttckMappingOutput` (techniques[], primaryTactic, confidence, narrative) |
| `containment-recommendation` | `RuleContainmentRecommendationWorker` -- `ContainmentDecisionMatrix` (severity x tactic matrix) with `PlannedAction` | `LlmContainmentRecommendationWorker` -- `WorkerFunction.Sync` with `PlannedAction` extraction | `ContainmentRecommendationOutput` (recommendedAction, riskScore, confidenceScore, rationale, actionParameters) |

Workers are registered programmatically in `SocInvestigationCaseDescriptor` and injected into the case definition via `SocCaseHub.augment()`. Bootstrap routing selects rule-based workers by convention (insertion order). LLM workers register with `noFunction()` when `langchain4j-anthropic` is unavailable at runtime.

**Case goals** (any resolves the case):
- `resolved` -- `.analystDecision == "resolved"`
- `escalated` -- `.analystDecision == "escalated"`
- `false-positive` -- `.analystDecision == "false-positive"`

---

## Risk Classification and Containment Gates

`SocActionRiskClassifier` implements `ActionRiskClassifier` with `@RiskClassifier` qualifier. When a containment worker returns a `PlannedAction`, the engine routes it through the classifier before advancing the case.

**Action taxonomy** (defined in `SocActionType`):

| Action | Gate Policy | Reversible | Approver Groups |
|---|---|---|---|
| `ENABLE_ENHANCED_LOGGING` | NEVER | Yes | -- |
| `ROTATE_API_KEY` | CONFIDENCE_THRESHOLD | Yes | `soc-tier2-analyst` |
| `BLOCK_IP` | RISK_SCORE_THRESHOLD | No | `soc-tier2-analyst` |
| `BLOCK_DOMAIN` | RISK_SCORE_THRESHOLD | No | `soc-tier2-analyst` |
| `DISABLE_USER_ACCOUNT` | ALWAYS | No | `soc-manager` |
| `ISOLATE_HOST` | ALWAYS | No | `soc-manager` |
| `REVOKE_CREDENTIALS` | ALWAYS | No | `soc-manager` |
| `NETWORK_SEGMENTATION` | ALWAYS | No | `soc-manager`, `soc-network-ops` |
| `WIPE_ENDPOINT` | ALWAYS | No | `soc-manager`, `soc-ciso` |

**Thresholds** (in `SocActionRiskClassifier`):
- Risk score gate: >= 0.8 triggers human approval
- Confidence gate: < 0.9 triggers human approval
- Missing context: fail-closed (always gates)

---

## Failure Handling

`SocFaultedCaseReviewCreator` implements `CaseOutcomeObserver` and listens for `FAULTED` case outcomes on `incident-investigation` cases. When the automated investigation pipeline stalls (e.g., a worker fails and subsequent binding guards never become true), it creates a failure-review WorkItem:

- **Candidate groups:** `soc-tier2-analyst`
- **Priority:** derived from alert severity (CRITICAL -> URGENT, HIGH -> HIGH, etc.)
- **Permitted outcomes:** `acknowledged`, `escalated`
- **Caller ref:** `case-faulted:{caseId}` -- idempotent, prevents duplicate WorkItems
- **Runs in a new transaction** (`QuarkusTransaction.requiringNew()`)

---

## Domain Model (api module)

### Enums and Records

| Type | Package | Purpose |
|---|---|---|
| `AlertSeverity` | `io.casehub.soc.domain` | 5-level severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL. `isActionable()` returns false for INFORMATIONAL. |
| `AttackTactic` | `io.casehub.soc.domain` | 14 MITRE ATT&CK Enterprise tactics with MITRE IDs (TA0001-TA0043) and display names |
| `AttackTechnique` | `io.casehub.soc.domain` | Record: techniqueId (T####[.###] validated), name, tactic, subtechniqueOf |
| `Ioc` | `io.casehub.soc.domain` | Record: type, value, confidence [0.0-1.0], firstSeen, source, tags. Equality by (type, value). |
| `IocType` | `io.casehub.soc.domain` | 12 IOC types: IP_ADDRESS, FILE_HASH_MD5/SHA1/SHA256, DOMAIN, URL, EMAIL, CVE, USER_AGENT, REGISTRY_KEY, MUTEX, CERTIFICATE_HASH |
| `SocActionType` | `io.casehub.soc.domain` | 9 containment action types with gate policy, reversibility, candidate groups, reason |
| `SocCapabilities` | `io.casehub.soc.domain` | Capability tag constants (`soc:alert-classification`, `soc:ioc-correlation`, `soc:host-isolation`, etc.) |
| `SocCaseTypes` | `io.casehub.soc.domain` | Case definition name constants (`incident-investigation`) |
| `SocGroups` | `io.casehub.soc.domain` | Analyst group constants: `soc-tier1-analyst`, `soc-tier2-analyst`, `soc-tier3-analyst`, `soc-manager`, `soc-network-ops`, `soc-ciso` |

### Worker Output Contracts (api module)

Shared between rule-based and LLM workers:

| Contract | Package | Fields |
|---|---|---|
| `IocEnrichmentOutput` | `io.casehub.soc.worker.contract` | `iocs` (list of IocEntry: type, value, source), `summary` |
| `AttckMappingOutput` | `io.casehub.soc.worker.contract` | `techniques` (list of TechniqueEntry: technique, confidence, evidence), `primaryTactic`, `confidence`, `narrative` |
| `ContainmentRecommendationOutput` | `io.casehub.soc.worker.contract` | `recommendedAction`, `riskScore`, `confidenceScore`, `rationale`, `actionParameters` |

### Detection

| Type | Package | Purpose |
|---|---|---|
| `SiemAlertGanglion` | `io.casehub.soc.detection` | Extends `JavaSwitchGanglion`. Classifies 6 CloudEvent types by severity. GANGLION_ID: `siem-alert-classifier`. Lives in api/ (pure Java); CDI production via `SocGanglionProducer` in app/. |

---

## Accountability Properties

| Compliance requirement | Without casehub-soc | With casehub-soc |
|---|---|---|
| Auditable incident response chain | Append-only SIEM logs; no decision attribution | Commitment per agent task; `causedByEntryId` chains the full investigation |
| Human authorisation for containment | Ad-hoc Slack approval; no formal gate | WorkItem with oversight gate; `SocActionRiskClassifier` gates containment actions |
| SOC2 / DORA compliance evidence | Manual compliance reports | Merkle inclusion proofs; tamper-evident response record (planned -- Layer 5) |
| Trust-weighted analyst routing | Round-robin or manual assignment | Bayesian Beta from incident resolution attestations (planned -- Layer 4a) |
| Incident knowledge retention | Tribal knowledge; runbooks rot | CBR: past incidents inform future triage (planned -- Layer 4b) |
| Response time SLA enforcement | Alert fatigue; missed deadlines | `SlaBreachPolicy` with escalation chain to SOC manager (planned -- Layer 3) |

---

## Dependencies

### Currently Wired (in app/pom.xml)

| Dependency | Purpose |
|---|---|
| `casehub-platform` | Core identity, preferences, streaming |
| `casehub-platform-config` | YAML-backed `PreferenceProvider` |
| `casehub-platform-expression` | `JQEvaluator` for engine bindings |
| `casehub-engine` | Adaptive case engine (case definitions, bindings, context-change triggers) |
| `casehub-engine-planning` | Planning architecture (formerly blackboard) |
| `casehub-engine-ledger` | Trust-weighted routing (activates `TrustWeightedAgentStrategy`) |
| `casehub-engine-scheduler-quartz` | Quartz-based SLA scheduling |
| `casehub-work-engine-adapter` | WorkItem integration for human tasks and oversight gates |
| `casehub-engine-persistence-memory` | In-memory engine SPIs (CaseInstance, PlanItem, EventLog, etc.) |
| `casehub-ledger` | Tamper-evident audit trail, Merkle MMR |
| `casehub-work` | Human task lifecycle (WorkItem, SLA breach policy) |
| `casehub-qhorus` | Multi-agent channel coordination (work/observe/oversight) |
| `casehub-worker` | Worker primitives (`Worker`, `WorkerFunction`, `PlannedAction`) |
| `casehub-ras` | RAS runtime -- situational awareness detection pipeline |
| `casehub-ras-persistence-memory` | In-memory SituationStore |
| `casehub-neocortex-memory-api` | Case memory SPIs |
| `casehub-neocortex-memory` | Memory runtime |
| `casehub-neocortex-memory-jpa` | JPA memory persistence |

### Test-Scope Dependencies

`casehub-platform-testing`, `casehub-qhorus-testing`, `casehub-engine-testing`, `casehub-worker-testing`, `casehub-neocortex-memory-inmem`

---

## Architecture Decision Records

| ADR | Title | Summary |
|---|---|---|
| ADR-001 | RAS + Cases over custom alert/incident entities | No custom SecurityAlert or Incident entities. Alerts are CloudEvents routed via RAS. Incidents are CaseInstances. Investigation state lives in CaseContext. App layer provides domain vocabulary, detection logic, risk classification, and declarative workflow. |

---

## What It Does NOT Do

- **Framework concerns** -- cases, commitments, trust, audit records belong in the foundation, not here
- **Generic coordination** -- channel management, agent orchestration, oversight gates are platform primitives
- **SIEM replacement** -- ingests SIEM events via CloudEvent but does not replace log collection or storage
- **Custom entity persistence** -- no JPA entities for alerts or incidents (ADR-001); state lives in CaseContext
- **Rule engine** -- uses platform capabilities (Drools CEP integration when available) rather than reimplementing pattern detection

---

## Configuration

**application.properties** (development defaults):
- H2 in-memory database (PostgreSQL mode) for both primary and qhorus datasources
- Flyway migrations for work and memory schemas (primary) and qhorus/ledger schemas (qhorus datasource)
- In-memory engine persistence SPIs selected via `quarkus.arc.selected-alternatives`

**RAS Situation Configuration** (`META-INF/ras-situations.yaml`):
- `soc-siem-alert-critical`: threshold chain mode, requires >= 0.8 confidence from `siem-alert-classifier` Ganglion, 15-minute correlation window, 30-second buffer delay. Triggers `incident-investigation` case creation.

---

## Platform Gaps (Known)

| Gap | Issue | Impact |
|---|---|---|
| `Agent.plannedActionExtractor` | engine#829 | Enables uniform `AgentWorkerFunction` for containment LLM worker (currently uses `WorkerFunction.Sync` workaround) |
| Worker reroute on failure | -- | Engine infra exists but exclusion list writer missing |
| Drools CEP | engine#809 | Blocks Slice 3 (real-time event correlation) |
| Multi-approver OversightGate | engine#810 | Layer 3 single-approver workaround |
| Durable EventStore | pages#256 | Production deployment |
| `langchain4j-anthropic` runtime | -- | LLM workers register with `noFunction()` until added to classpath |
