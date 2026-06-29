# casehub-soc — Arc42 Stories

**Date:** 2026-06-29
**Status:** Design phase — no implementation yet
**Platform review:** Complete (see `PLATFORM-INVENTORY.md`)

This document defines the full delivery plan for casehub-soc. Each epic is independently deliverable, references concrete platform SPIs, and has testable acceptance criteria. The sequence is intentional — each epic builds on the previous.

---

## Vision Statement

Build a Security Operations Center application on the CaseHub agentic harness that demonstrates:
1. **Trust-weighted multi-agent incident response** — AI and human agents coordinate with formal accountability
2. **CBR-based triage learning** — past incidents inform future triage via case-based reasoning
3. **Tamper-evident compliance** — SOC2/DORA/NIS2 evidence generated as a byproduct of normal operation
4. **Adaptive containment governance** — irreversible actions gated by risk classification and human oversight

---

## Epic Overview

| # | Epic | Delivers | MVP? | Dependencies |
|---|---|---|---|---|
| 1 | Domain Model & Alert Ingestion | Entities, CloudEvent adapter, alert reception | Yes | — |
| 2 | Incident Triage & Case Lifecycle | Triage workflow, case creation, analyst WorkItems | Yes | Epic 1 |
| 3 | Threat Intelligence Enrichment | IOC model, ATT&CK mapping, feed integration | Yes | Epic 2 |
| 4 | Containment & Response Governance | Risk classification, approval gates, containment execution | Yes | Epic 2 |
| 5 | Agent Fleet & Trust Routing | Agent descriptors, trust dimensions, trust-weighted routing | — | Epics 2, 4 |
| 6 | CBR-Based Triage Learning | Retain/Retrieve/Reuse cycle, memory wiring | — | Epics 2, 5 |
| 7 | Compliance & Audit Evidence | Ledger subclasses, Merkle proofs, DORA/SOC2 reports | — | Epics 2, 4 |
| 8 | SOC Dashboard | Pages datasets, incident views, trust heatmaps | — | Epics 2, 5 |
| 9 | LLM Agent Fusion | Claude-powered investigation, narrative synthesis, MCP tools | — | Epics 5, 6 |
| 10 | Real-Time Event Correlation | casehub-ras integration, temporal pattern detection | — | Epic 1 |
| 11 | Multi-Tenant SOC-as-a-Service | Tenant isolation, per-tenant configuration, RLS | — | All |

**MVP = Epics 1–4.** A functional incident response pipeline: alerts arrive → triage → investigate → contain (with approval) → resolve.

---

## Epic 1: Domain Model & Alert Ingestion

**Goal:** Define the SOC domain model and receive raw security alerts from external SIEM/EDR systems.

**Rationale:** Everything else depends on having domain entities and an alert ingestion pathway. Start with the data model and the ability to receive alerts — the simplest possible vertical slice.

### Stories

#### 1.1 SecurityAlert domain entity

**Module:** `api/`

**What:** Pure-Java record/interface for a raw security alert. No JPA, no framework deps.

**Fields:**
- `alertId` (UUID)
- `source` (String — e.g., "crowdstrike", "splunk", "suricata")
- `sourceAlertId` (String — external system's ID)
- `timestamp` (Instant)
- `rawPayload` (String — original JSON/CEF/syslog)
- `severity` (enum: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL)
- `category` (String — alert category from source system)
- `affectedAssets` (List<String> — IPs, hostnames, user accounts)
- `description` (String)

**Acceptance:** Compiles with zero dependencies. Used by subsequent stories.

#### 1.2 IOC (Indicator of Compromise) domain entity

**Module:** `api/`

**What:** Value object representing an observable artifact — IP address, file hash, domain, URL, email address, CVE.

**Fields:**
- `type` (enum: IP_ADDRESS, FILE_HASH_MD5, FILE_HASH_SHA256, DOMAIN, URL, EMAIL, CVE)
- `value` (String)
- `confidence` (double, 0.0–1.0)
- `firstSeen` (Instant)
- `source` (String — where this IOC was observed)
- `tags` (Set<String> — e.g., "malware", "c2", "phishing")

**Acceptance:** Immutable. Equality by (type, value). Usable in sets and maps.

#### 1.3 ATT&CK Technique taxonomy

**Module:** `api/`

**What:** Enum or reference data for MITRE ATT&CK technique identification. At minimum, model the 14 tactics as an enum. Technique IDs (T1566, T1059, etc.) as strings with tactic association.

**Fields:**
- `AttackTactic` enum: RECONNAISSANCE, RESOURCE_DEVELOPMENT, INITIAL_ACCESS, EXECUTION, PERSISTENCE, PRIVILEGE_ESCALATION, DEFENSE_EVASION, CREDENTIAL_ACCESS, DISCOVERY, LATERAL_MOVEMENT, COLLECTION, COMMAND_AND_CONTROL, EXFILTRATION, IMPACT
- `AttackTechnique` record: `techniqueId` (String, e.g., "T1566"), `name` (String), `tactic` (AttackTactic), `subtechniqueOf` (Optional<String>)

**Acceptance:** All 14 MITRE ATT&CK tactics represented. Technique IDs parseable from standard MITRE format.

#### 1.4 Incident domain entity

**Module:** `api/`

**What:** A confirmed threat — promoted from a SecurityAlert after triage. This is the core domain entity that maps to a `CaseInstance` in the engine.

**Fields:**
- `incidentId` (UUID)
- `title` (String)
- `severity` (enum: reuse from SecurityAlert or define incident-specific scale)
- `status` (enum: DETECTED, TRIAGING, INVESTIGATING, CONTAINING, ERADICATING, RECOVERING, RESOLVED, CLOSED)
- `priority` (enum: P1, P2, P3, P4)
- `triggeringAlerts` (List<UUID> — SecurityAlert IDs that triggered this incident)
- `iocs` (List<IOC>)
- `attackTechniques` (List<AttackTechnique>)
- `assignedAnalyst` (String — actorId)
- `createdAt` / `updatedAt` (Instant)

**Acceptance:** Compiles with zero deps. Status enum has `isTerminal()` and `isActive()` (following LIFECYCLE.md convention).

#### 1.5 CloudEvent adapter for SIEM webhook ingestion

**Module:** `app/`

**What:** REST endpoint that receives raw SIEM alerts as CloudEvents via webhook. Parses the payload into a `SecurityAlert` and fires a CDI event for downstream processing.

**Platform dependency:** `casehub-platform-stream-webhook`

**Flow:**
1. SIEM sends HTTP POST with CloudEvent envelope (content-type: `application/cloudevents+json`)
2. Adapter extracts `ce-type` (e.g., `soc.alert.siem.splunk`, `soc.alert.edr.crowdstrike`)
3. Adapter parses `data` into `SecurityAlert`
4. Fires `Event<SecurityAlertReceived>` via CDI

**Acceptance:** Receives a CloudEvent POST, parses to SecurityAlert, CDI event fires. Integration test with sample Splunk/CrowdStrike alert payloads.

#### 1.6 SecurityAlert JPA entity

**Module:** `app/`

**What:** JPA `@Entity` persisting SecurityAlerts to PostgreSQL. Separate from the `api/` domain record — the JPA entity is the infrastructure adapter.

**Acceptance:** Flyway migration creates table. CRUD operations work. Query by source, severity, time range.

### Platform Capabilities Used
- `casehub-platform`: CloudEvents streaming (webhook adapter)
- `casehub-platform`: `CurrentPrincipal` for tenancy

### Deliverable
Can receive a SIEM alert via webhook, parse it into domain entities, persist it, and fire CDI events for downstream processing.

---

## Epic 2: Incident Triage & Case Lifecycle

**Goal:** Triage incoming alerts, promote confirmed threats to incidents, and create analyst work items with SLA enforcement.

**Rationale:** This is where the CaseHub engine enters. An alert becomes a case. The case drives the investigation workflow. Human analysts receive work items. SLA policies enforce response times.

### Stories

#### 2.1 Case definition — triage playbook (YAML)

**What:** Declarative case definition for the basic triage workflow. YAML file defining:
- Capability: `alert-classification`
- Trigger: `contextChange` on alert receipt
- Binding: capability target → triage agent
- HumanTask binding: analyst review of triage result
- Outcomes: CONFIRM, ESCALATE, FALSE_POSITIVE

**Platform:** `CaseDefinition` (casehub-engine-schema)

**Acceptance:** Engine loads YAML, creates CaseInstance on alert receipt, dispatches to triage agent.

#### 2.2 Alert-to-incident promotion workflow

**What:** When triage confirms the alert is real:
1. Create `Incident` domain entity
2. Create `CaseInstance` in engine (incident IS the case)
3. Associate triggering alerts
4. Set priority based on severity + asset criticality

**Platform:** `CaseHubRuntime`, `CaseInstanceRepository`

**Acceptance:** Confirmed alert → Incident created → CaseInstance running → investigation workflow begins.

#### 2.3 Rule-based triage agent (WorkerFunction)

**What:** First triage agent — rule-based, not LLM. Implements `WorkerFunction`. Classifies alert severity based on:
- Source system confidence score
- Alert category → ATT&CK tactic mapping
- Affected asset criticality
- Time-of-day anomaly (alerts at 3am on a domain controller are more suspicious)

**Platform:** `WorkerFunction` (casehub-worker), `Worker`, `Capability`

**Acceptance:** Agent receives COMMAND, classifies severity, returns `WorkerResult` with severity + confidence + ATT&CK mapping. Unit tested with diverse alert scenarios.

#### 2.4 Analyst WorkItem for triage review

**What:** After rule-based triage, create a WorkItem for human analyst review. Analyst confirms or overrides the automated classification.

**Platform:** `casehub-work` WorkItem, `casehub-engine-work-adapter` HumanTaskTarget, `SlaBreachPolicy`

**WorkItem template:**
- Category: `triage-review`
- Candidate groups: `tier1-analyst`
- Outcomes: `CONFIRM_SEVERITY`, `DOWNGRADE`, `ESCALATE`, `FALSE_POSITIVE`
- Claim SLA: 5 min (P1), 15 min (P2), 1 hr (P3)
- Completion SLA: 15 min (P1), 1 hr (P2), 24 hr (P3)

**Acceptance:** WorkItem created with SLA. Analyst completes → case context updated → workflow advances. SLA breach → escalation triggers.

#### 2.5 SLA breach policy — SOC escalation chain

**What:** Implement `SlaBreachPolicy` with chained escalation:
- Claim breach → escalate to next tier
- Completion breach → escalate to SOC manager with extended deadline
- Final breach → fail with audit record

**Platform:** `SlaBreachPolicy`, `BreachDecision` (Fail/EscalateTo/Extend/Chained)

**Acceptance:** SLA breach fires → escalation to correct groups → new deadline set. Integration test with time manipulation.

#### 2.6 Incident lifecycle state management

**What:** Track incident status transitions (DETECTED → TRIAGING → INVESTIGATING → etc.) via case context. Emit CDI events on transitions for downstream observers.

**Platform:** `CaseInstance` context, `CaseContextChangedEventHandler`

**Acceptance:** Status transitions recorded. Context-change triggers fire correctly. Lifecycle events observable.

### Platform Capabilities Used
- `casehub-engine`: CaseInstance, CaseDefinition YAML, context-change triggers
- `casehub-engine-work-adapter`: HumanTask target, WorkItem lifecycle bridging
- `casehub-engine-blackboard`: PlanItem/SubCase lifecycle
- `casehub-work`: WorkItem, SLA breach, outcomes
- `casehub-worker`: WorkerFunction, Capability
- `casehub-qhorus`: /work channel for agent dispatch

### Deliverable
End-to-end: alert received → auto-triaged → analyst reviews → incident promoted or dismissed → SLA enforced throughout.

---

## Epic 3: Threat Intelligence Enrichment

**Goal:** Enrich incidents with external threat intelligence. Map indicators to ATT&CK techniques. Correlate IOCs across sources.

### Stories

#### 3.1 ThreatIntelReport domain entity

**Module:** `api/`

**Fields:**
- `reportId` (UUID)
- `incidentId` (UUID — associated incident)
- `iocs` (List<IOC> — indicators found)
- `attackTechniques` (List<AttackTechnique> — mapped ATT&CK)
- `threatActor` (Optional<String> — attribution if known)
- `campaign` (Optional<String> — campaign name)
- `confidence` (double)
- `source` (String — which feed/agent produced this)
- `createdAt` (Instant)

#### 3.2 Threat intelligence enrichment worker

**What:** `WorkerFunction` that queries external threat intelligence sources (VirusTotal, AbuseIPDB, OTX, MISP) for IOC enrichment. Takes alert IOCs as input, returns enriched ThreatIntelReport.

**Platform:** `WorkerFunction`, `EndpointRegistry` (for per-tenant feed API config)

**Acceptance:** Given IOCs, queries configured feeds, returns enrichment with ATT&CK mapping and confidence scores.

#### 3.3 IOC correlation service

**What:** Service that correlates IOCs across incidents. "We've seen this IP in 3 incidents this week" → escalate priority. Cross-references current IOCs against historical incident data.

**Platform:** `CaseMemoryStore` (query past incidents by IOC), database queries

**Acceptance:** Given IOCs from current incident, returns list of prior incidents sharing the same indicators with match counts and timeline.

#### 3.4 ATT&CK technique mapping worker

**What:** `WorkerFunction` that analyses enriched alert data and maps observed behaviour to ATT&CK techniques. Could be rule-based (pattern matching on alert category + IOC types) or ONNX-based (`TextClassifier` from casehub-neural-text).

**Platform:** `WorkerFunction`, optionally `TextClassifier` (casehub-neural-text-inference)

**Acceptance:** Given enriched alert, maps to ATT&CK technique(s) with confidence scores. Kill chain progression visible (which tactics observed so far).

#### 3.5 Case definition — enrichment playbook

**What:** Extend the triage case definition with enrichment bindings:
- After triage confirms alert → trigger enrichment worker
- After enrichment complete → update case context with IOCs + ATT&CK mapping
- Context-change trigger: if enrichment reveals critical severity → re-trigger triage review

**Platform:** YAML case definition, `contextChange` triggers, `contextWrite` for result projection

#### 3.6 Observe channel integration

**What:** Enrichment agents write findings to `/observe` channel as EVENT messages. All investigation participants see the enrichment in real-time.

**Platform:** `casehub-qhorus` observe channel, EVENT message type

**Acceptance:** Enrichment findings appear on /observe. Investigation context updated. Other agents can react to newly discovered IOCs.

### Platform Capabilities Used
- `casehub-worker`: WorkerFunction for feed queries and ATT&CK mapping
- `casehub-platform`: EndpointRegistry for per-tenant feed configuration
- `casehub-platform`: CaseMemoryStore for IOC cross-referencing
- `casehub-neural-text`: TextClassifier for ONNX-based technique classification (optional)
- `casehub-qhorus`: observe channel for findings broadcast
- `casehub-connectors`: outbound HTTP for threat feed APIs

### Deliverable
Incidents enriched with IOC data from external feeds, mapped to ATT&CK techniques, with cross-incident IOC correlation.

---

## Epic 4: Containment & Response Governance

**Goal:** Execute containment actions with risk-based governance. Irreversible actions require human approval. All actions tamper-evident.

### Stories

#### 4.1 ContainmentAction domain entity

**Module:** `api/`

**What:** Structured representation of a containment action. Following AML's `AmlActionType` pattern — action type encodes gate policy, reversibility, and candidate groups.

**`SocActionType` enum:**
```
ENABLE_ENHANCED_LOGGING(NEVER, true)
ROTATE_API_KEY(CONFIDENCE_THRESHOLD, true)
BLOCK_IP(RISK_SCORE_THRESHOLD, partial)
BLOCK_DOMAIN(RISK_SCORE_THRESHOLD, partial)
DISABLE_USER_ACCOUNT(ALWAYS, false)
ISOLATE_HOST(ALWAYS, false)
REVOKE_CREDENTIALS(ALWAYS, false)
NETWORK_SEGMENTATION(ALWAYS, false)
WIPE_ENDPOINT(ALWAYS, false)
```

Each entry carries: gate policy, reversibility, default candidate groups for approval, scope path.

#### 4.2 ActionRiskClassifier implementation

**What:** `@RiskClassifier @ApplicationScoped` implementation of `ActionRiskClassifier`. Derives gate metadata from `SocActionType`:
- NEVER → auto-approve (no WorkItem)
- CONFIDENCE_THRESHOLD → gate only if agent confidence < threshold
- RISK_SCORE_THRESHOLD → gate based on asset criticality
- ALWAYS → always create WorkItem for human approval

**Platform:** `ActionRiskClassifier` SPI (casehub-engine)

**Acceptance:** High-risk actions (ISOLATE_HOST) always create WorkItem. Low-risk actions (ENABLE_ENHANCED_LOGGING) auto-approve. Threshold-based actions gate correctly based on confidence/criticality.

#### 4.3 Containment approval WorkItem

**What:** WorkItem for SOC manager to approve containment. Rich context: what action, against which asset, why (investigation findings), what's the risk.

**Outcomes:** `APPROVE`, `REJECT`, `MODIFY_AND_APPROVE` (e.g., "isolate but preserve memory dump first")

**Platform:** `casehub-work` WorkItem, HumanTaskTarget binding

**Acceptance:** SOC manager receives WorkItem with full context. Approval → containment proceeds. Rejection → case context updated, alternative path activated.

#### 4.4 Containment execution worker

**What:** `WorkerFunction` implementations that call EDR/infrastructure APIs to execute containment:
- Host isolation → CrowdStrike/SentinelOne Real Time Response API
- Credential revocation → Active Directory / Okta API
- Network segmentation → firewall/NAC API
- IP blocking → firewall/WAF API

**Platform:** `WorkerFunction`, `EndpointRegistry` (per-tenant EDR endpoints), `PlannedAction`

**Acceptance:** Worker receives approved containment action, calls EDR API, returns success/failure. Failure → retry with backoff via `DefaultOutcomePolicy`.

#### 4.5 Case definition — containment playbook

**What:** Extend case definition with containment bindings:
- Trigger: investigation findings indicate containment needed
- Binding guard: `.actionGateRejected == null and .actionGateApproved == null` (prevent re-scheduling loop)
- HumanTask binding for approval gate
- Capability binding for containment execution post-approval

**Critical:** Must exclude gate signal paths from triggers per ARCHITECTURE.md guidance.

#### 4.6 Containment ledger entries

**What:** Tamper-evident records for containment decisions and executions.

**LedgerEntry subclasses:**
- `ContainmentDecisionLedgerEntry` — records approval/rejection with rationale, approver identity
- `ContainmentExecutedLedgerEntry` — records what action was taken, result, `causedByEntryId` → decision entry

**Platform:** `LedgerEntry` subclass, Flyway V1011+ migration, CDI observer

**Acceptance:** Containment decision → LedgerEntry created. Execution → LedgerEntry with causal chain. Entries are hash-chained (Merkle MMR).

### Platform Capabilities Used
- `casehub-engine`: ActionRiskClassifier, CaseDefinition bindings with guards
- `casehub-engine-work-adapter`: HumanTask approval gate
- `casehub-work`: WorkItem with outcomes
- `casehub-worker`: WorkerFunction for containment execution
- `casehub-ledger`: LedgerEntry subclasses, causedByEntryId chain
- `casehub-platform`: EndpointRegistry for per-tenant EDR config

### Deliverable
End-to-end containment: investigation finding → risk classification → approval gate → execution → tamper-evident audit record.

---

## Epic 5: Agent Fleet & Trust Routing

**Goal:** Register the SOC agent fleet with typed capabilities, enable trust-weighted routing, and score agent performance.

### Stories

#### 5.1 SOC agent descriptors

**What:** Register `AgentDescriptor` entries for the SOC agent fleet at startup. Each agent has identity, slot, capabilities, and disposition.

**Agents (initial fleet):**
- `claude:alert-triage@v1` — triage analyst, capabilities: `alert-classification`, `severity-assessment`
- `claude:threat-intel@v1` — intelligence analyst, capabilities: `ioc-correlation`, `attck-mapping`, `feed-enrichment`
- `claude:containment@v1` — incident responder, capabilities: `host-isolation`, `credential-revocation`, `network-segmentation`
- `claude:forensics@v1` — forensic analyst, capabilities: `evidence-collection`, `timeline-reconstruction`
- `rule:siem-classifier` — rule-based triage (non-LLM), capability: `alert-classification`

**Platform:** `AgentRegistry`, `AgentDescriptor` (casehub-eidos)

#### 5.2 SOC capability tags aligned with ATT&CK

**What:** Define capability tags that map to ATT&CK tactics. Agents register which tactics they're strong at. Trust scoring partitions by tactic.

**Capability tag convention:** `soc:{tactic}:{function}` — e.g., `soc:initial-access:triage`, `soc:credential-access:investigation`, `soc:lateral-movement:containment`

**Platform:** `AgentCapability` (casehub-eidos-api)

#### 5.3 SOC trust dimensions

**What:** Define the trust dimensions specific to SOC agent performance scoring.

**Dimensions:**
- `triage-accuracy` — was the severity classification correct?
- `investigation-thoroughness` — were all relevant IOCs identified?
- `containment-effectiveness` — did the containment stop the threat?
- `false-positive-rate` — how often does this agent raise false alarms?
- `response-speed` — how quickly does the agent complete assigned tasks?

**Platform:** `ActorTrustScore` dimensions (casehub-ledger)

#### 5.4 Incident resolution attestation service

**What:** At incident close, SOC manager or peer analyst attests to the quality of the triage/investigation/containment. This attestation updates trust scores.

**Following AML's `SarOutcomeFeedbackService` pattern:**
1. Incident resolves → prompt for outcome attestation
2. Attestation: SOUND (correct) or FLAGGED (incorrect/incomplete)
3. `LedgerAttestation` written → trust score updated
4. `CommitmentAttestationPolicy` translates commitment outcomes to attestation verdicts

**Platform:** `LedgerAttestation`, `CommitmentAttestationPolicy`, incremental trust recomputation

**Acceptance:** Attestation written → trust score updated within transaction (incremental mode) or at next batch (nightly job).

#### 5.5 Trust-weighted routing activation

**What:** Enable trust-weighted agent routing by adding `casehub-engine-ledger` to classpath. Route incident tasks to agents with highest trust score for the relevant ATT&CK tactic.

**Platform:** `TrustWeightedAgentStrategy` (Priority 1, classpath-activated)

**Acceptance:** Investigation task for credential-access incident → routed to agent with highest `triage-accuracy` trust for `credential-access` tactic.

#### 5.6 Capability health probes

**What:** Implement `CapabilityHealth` probes for SOC agents. Check EDR API connectivity, threat feed availability, agent process health.

**Platform:** `CapabilityHealth.probe()` → Ready/Degraded/Unavailable/EpistemicallyWeak

**Acceptance:** EDR API down → agent probe returns Unavailable → agent filtered from routing. Agent returns Degraded → sorted last.

#### 5.7 Trust score seeder

**What:** Seed initial trust scores at startup for agents without history. Following AML's `AmlTrustScoreSeeder` pattern.

**Platform:** `TrustBootstrapSource`, `TrustImportService`

**Acceptance:** New agent starts with Beta(1,1) = 0.5 prior for all dimensions. Seeded scores respected by routing.

### Platform Capabilities Used
- `casehub-eidos`: AgentDescriptor, AgentRegistry, CapabilityHealth
- `casehub-eidos-graph`: AgentGraphStore for outcome tracking
- `casehub-ledger`: Trust scoring (Bayesian Beta), LedgerAttestation
- `casehub-engine-ledger`: TrustWeightedAgentStrategy

### Deliverable
Agent fleet registered with capabilities. Incidents routed to most-trusted agent for the relevant ATT&CK tactic. Agent performance tracked and scored.

---

## Epic 6: CBR-Based Triage Learning

**Goal:** Past incidents inform future triage. Implement the Retain → Retrieve → Reuse cycle.

### Stories

#### 6.1 Incident-to-case memory mapping

**What:** Define how resolved incidents are represented as memory entries for CBR. Feature vector:
```
alert_type, source_system, attck_techniques (list),
target_asset_criticality, ioc_types_present,
time_of_day_pattern, severity_outcome,
investigation_duration_hours, containment_success,
false_positive (boolean), playbook_used
```

**Platform:** `MemoryInput` (casehub-platform CaseMemoryStore)

#### 6.2 Retain — write resolved incidents to CaseMemoryStore

**What:** At incident closure, write both:
1. `LedgerAttestation` (trust feedback — already from Epic 5.4)
2. `CaseMemoryStore` entry with full incident representation (problem + solution + outcome)

**Following AML's `AmlMemoryService` pattern.**

**Platform:** `CaseMemoryStore.store()`, CDI observer on incident closure event

**Acceptance:** Every resolved incident produces a CaseMemoryStore entry. Entry includes problem features, solution (playbook, containment actions), and outcome.

#### 6.3 Retrieve — query similar past incidents during triage

**What:** When a new alert arrives for triage, query CaseMemoryStore for similar past incidents. Present top-k to triage agent as context.

**Two retrieval paths:**
1. **Structured query (JPA FTS):** Match by ATT&CK technique + IOC type + source system
2. **Semantic query (future, Mem0/neural-text):** Match by natural language description similarity

**Platform:** `CaseMemoryStore.query()` or `CaseRetriever.retrieve()` (casehub-neural-text)

**Acceptance:** Triage agent receives "3 similar past incidents" in its investigation context. Past outcomes influence severity recommendation.

#### 6.4 Reuse — pre-populate triage from retrieved cases

**What:** When similar past incidents are retrieved:
- Pre-populate recommended severity based on past outcomes
- Suggest playbook based on what worked before
- Flag if past similar incidents had high false-positive rate → increase scrutiny
- Suggest IOCs to look for based on past investigations

**Platform:** Engine context-change bindings, `canActivate()` gating on TaskDefinitions

**Acceptance:** Triage agent's recommendation incorporates CBR context. Analyst sees "Based on 5 similar past incidents: 80% were P2, 60% used the phishing-credential-harvesting playbook."

#### 6.5 Concept drift handling

**What:** Attack patterns evolve. Old cases can mislead. Implement temporal weighting — recent incidents weighted more heavily than old ones. Optionally tag cases as "outdated" when ATT&CK techniques are revised.

**Platform:** `CaseMemoryStore` query with recency weighting, `MemoryDomain` for tagging

**Acceptance:** 6-month-old ransomware cases weighted lower than 1-week-old cases. Analyst can mark retrieved cases as "no longer relevant."

### Platform Capabilities Used
- `casehub-platform`: CaseMemoryStore (Retain + Retrieve)
- `casehub-neural-text`: CaseRetriever for semantic retrieval (future)
- `casehub-engine`: Context bindings for Reuse
- `casehub-ledger`: LedgerAttestation for outcome recording

### Deliverable
Closed-loop learning: resolved incidents retained → new alerts retrieve similar past incidents → triage recommendations incorporate historical evidence.

---

## Epic 7: Compliance & Audit Evidence

**Goal:** Generate SOC2/DORA/NIS2 compliance evidence as a byproduct of normal incident response operations.

### Stories

#### 7.1 SOC-specific LedgerEntry subclasses

**What:** Full set of tamper-evident ledger entries for the incident lifecycle:
- `AlertTriageLedgerEntry` — alert received, severity assigned
- `IncidentPromotedLedgerEntry` — alert promoted to incident
- `InvestigationStepLedgerEntry` — investigation action performed
- `ContainmentDecisionLedgerEntry` — containment approved/rejected (from Epic 4.6)
- `ContainmentExecutedLedgerEntry` — containment action executed (from Epic 4.6)
- `IncidentResolvedLedgerEntry` — incident closed with outcome

All entries linked via `causedByEntryId` chain — full decision provenance from alert to resolution.

**Platform:** `LedgerEntry` subclass, JPA @Entity + @DiscriminatorValue, Flyway V1011+

#### 7.2 Incident timeline view

**What:** API endpoint that retrieves all ledger entries for a single incident, ordered by timestamp, with `causedByEntryId` chain visualised. Shows the complete decision chain from alert to resolution.

**Platform:** `LedgerEntryRepository` query by `subjectId`

**Acceptance:** Given incident ID, returns ordered timeline of all decisions, actions, and outcomes with causal links.

#### 7.3 Merkle inclusion proof endpoint

**What:** API endpoint where an auditor can request a cryptographic proof that a specific containment decision was recorded at a specific time and has not been altered.

**Platform:** `LedgerVerificationService`, Merkle Mountain Range (RFC 9162)

**Acceptance:** Auditor submits entry ID → receives inclusion proof → can independently verify against published frontier.

#### 7.4 DORA response time report

**What:** Report showing incident classification + response timeline for DORA compliance:
- Time from alert to triage
- Time from triage to investigation start
- Time from investigation to containment decision
- Time from containment decision to execution
- SLA compliance percentage by priority

**Platform:** Ledger entry timestamps, WorkItem SLA data

#### 7.5 SOC2 Type II evidence export

**What:** Automated evidence collection for SOC2 Type II audit:
- All containment actions have approval records (WorkItem completion events)
- All investigation steps are attributed to identified actors
- All decisions are tamper-evident (Merkle proofs available)

**Platform:** `casehub-ops` compliance module, `EvidenceCollector`

#### 7.6 GDPR Art.17 erasure workflow

**What:** When a person who was investigated is cleared and requests data erasure:
1. Identify all ledger entries referencing their PII (IP, email, name)
2. Apply `DecisionContextSanitiser` to strip PII from decision context
3. Sever actor identity token
4. Write `ErasureReceiptLedgerEntry`

**Platform:** `LedgerErasureService`, `DecisionContextSanitiser`, `ErasureReceiptLedgerEntry`

**Acceptance:** PII erased from decision context. Structural audit trail preserved. Erasure receipt tamper-evident.

#### 7.7 GDPR Art.22 decision records

**What:** When automated triage makes a decision affecting an individual (e.g., blocking a user account), attach `ComplianceSupplement` to the ledger entry with: decision rationale, confidence score, human review availability, right to contest.

**Platform:** `ComplianceSupplement` (casehub-ledger)

### Platform Capabilities Used
- `casehub-ledger`: LedgerEntry subclasses, Merkle MMR, inclusion proofs, GDPR erasure
- `casehub-ops`: Compliance frameworks (SOC2, DORA, NIS2)
- `casehub-work`: WorkItem audit trail

### Deliverable
Compliance evidence generated automatically. Auditors can verify any decision. DORA/SOC2 reports available. GDPR erasure possible without destroying audit integrity.

---

## Epic 8: SOC Dashboard

**Goal:** Real-time operational dashboard for SOC operators using casehub-pages.

### Stories

#### 8.1 Incident status dataset
Active incidents by status (triaging/investigating/containing/resolved), grouped by priority. Real-time update via SSE.

#### 8.2 Agent trust heatmap dataset
Trust scores per agent per ATT&CK tactic. Colour-coded: green (high trust) → red (low trust / BOOTSTRAP).

#### 8.3 Channel activity dataset
Qhorus message volume on work/observe/oversight channels. Spike detection for unusual activity patterns.

#### 8.4 Kill chain progression widget
For each active incident: which ATT&CK tactics have been observed? Visual progression through the kill chain.

#### 8.5 SLA breach dashboard
Incidents approaching SLA deadline. Countdown timers. Historical SLA compliance rates.

#### 8.6 IOC correlation map
Shared IOCs across active incidents. Network graph showing relationships between incidents via common indicators.

### Platform Capabilities Used
- `casehub-pages`: iframe embed, dataset contracts
- `casehub-engine`: CaseInstance queries
- `casehub-qhorus`: channel message queries
- `casehub-ledger`: trust score queries
- `casehub-work`: SLA data, WorkItem status

### Deliverable
Web dashboard showing live SOC operational picture — incident status, agent trust, SLA health, kill chain progress.

---

## Epic 9: LLM Agent Fusion

**Goal:** Augment rule-based agents with LLM-powered capabilities. Claude agents for investigation, narrative synthesis, and natural language analyst interface.

### Stories

#### 9.1 LLM-powered triage agent
Claude agent that analyses alert context, queries threat feeds via MCP tools, and recommends severity with natural language rationale. Coexists with rule-based triage agent — `TrustWeightedAgentStrategy` routes based on performance.

#### 9.2 Threat narrative synthesis
Agent reads raw investigation data (log entries, IOC correlations, ATT&CK mapping) and produces analyst-readable incident summary. Writes to /observe channel.

#### 9.3 SOC-specific MCP tools
Domain tools exposed to LLM agents:
- `query_iocs(type, value)` — search IOC database
- `get_incident_context(incidentId)` — retrieve current investigation state
- `classify_alert(alertId)` — trigger classification
- `search_past_incidents(description)` — CBR retrieval via natural language
- `request_containment(action, target, rationale)` — submit containment request (goes through risk classification)

#### 9.4 Automated playbook generation
Agent reads resolved incident post-mortems and proposes new playbook (CaseDefinition YAML) for similar future incidents.

#### 9.5 Natural language analyst interface
Analyst asks questions in natural language: "What's the risk of IP 192.168.1.100?" → agent queries memory, feeds, and active incidents → responds with context.

### Platform Capabilities Used
- `casehub-platform`: AgentProvider (Claude sessions), AgentMcpServer
- `casehub-eidos`: AgentDescriptor for LLM agents
- `casehub-qhorus`: Channel dispatch for agent communication
- `casehub-neural-text`: CaseRetriever for semantic search

### Deliverable
LLM agents augmenting rule-based fleet. Natural language investigation, narrative synthesis, and analyst interaction.

---

## Epic 10: Real-Time Event Correlation

**Goal:** Detect complex attack patterns from multiple low-severity alerts using temporal correlation.

### Stories

#### 10.1 casehub-ras integration
Wire `casehub-ras` Ganglion detection strategies to SOC alert stream. Observes CloudEvents, routes to detection strategies.

#### 10.2 Temporal pattern detection rules
Define detection rules for multi-stage attacks:
- Reconnaissance (port scan) + Initial Access (exploit attempt) within 1 hour → escalate
- Multiple failed logins + successful login + data exfiltration within 30 minutes → credential compromise
- Malware detection on multiple hosts within 15 minutes → worm/lateral movement

#### 10.3 Sliding window correlation
Multiple low-severity alerts from different sources within a time window → auto-promote to high-severity incident.

#### 10.4 Alert aggregation
Deduplicate and aggregate related alerts. 1000 identical firewall drops from same source → single incident, not 1000 WorkItems.

### Platform Capabilities Used
- `casehub-ras`: Ganglion detection strategies, CloudEvent observation
- `casehub-platform`: CloudEvents streaming

### Deliverable
Complex attack patterns detected from correlated low-severity alerts. Alert noise reduced via aggregation and deduplication.

**Gap dependency:** Drools CEP integration in casehub-ras (Platform Gap #1 from PLATFORM-INVENTORY.md).

---

## Epic 11: Multi-Tenant SOC-as-a-Service

**Goal:** Full tenant isolation for managed SOC service providers.

### Stories

#### 11.1 Per-tenant EDR/SIEM configuration
Tenant-scoped EndpointRegistry entries for EDR and SIEM APIs. Each customer has their own CrowdStrike tenant, Splunk instance, etc.

#### 11.2 Per-tenant SLA policies
Preference-resolved SLA windows per tenant. Premium customers get tighter SLAs.

#### 11.3 Row-level security
PostgreSQL RLS enforced via `casehub.rls.enabled=true`. All JPA repositories extend `TenantAwareRepository`.

#### 11.4 Per-tenant agent pools
Trust scores scoped per tenant. Agent routing considers per-tenant performance history.

#### 11.5 Per-tenant compliance reporting
DORA/SOC2 evidence scoped to requesting tenant's incidents only.

### Platform Capabilities Used
- `casehub-platform`: CurrentPrincipal tenancyId, EndpointRegistry tenant scope
- `casehub-engine`: TenantAwareRepository, RLS
- `casehub-ledger`: Tenant-scoped trust scores

### Deliverable
Complete tenant isolation. Managed SOC provider can serve multiple customers with per-tenant configuration, SLAs, and compliance evidence.

---

## Delivery Sequence

```
MVP (Epics 1-4): Alert → Triage → Investigate → Contain → Resolve
    │
    ├── Epic 5: Agent Fleet & Trust    ─────┐
    │                                       │
    ├── Epic 7: Compliance & Audit          │
    │                                       │
    ├── Epic 6: CBR Learning ──────────────(depends on 5)
    │
    ├── Epic 8: Dashboard ─────────────────(depends on 5)
    │
    ├── Epic 9: LLM Fusion ───────────────(depends on 5, 6)
    │
    ├── Epic 10: Event Correlation ────────(independent, after 1)
    │
    └── Epic 11: Multi-Tenant ─────────────(after all)
```

**Parallel tracks after MVP:**
- Track A (agent maturity): Epics 5 → 6 → 9
- Track B (governance): Epic 7 (can start immediately after Epic 4)
- Track C (operations): Epics 8 and 10 (largely independent)
- Track D (scale): Epic 11 (last — requires everything else stable)

---

## Open Research Questions

These should be answered during Epic design sessions (brainstorming skill), not deferred to implementation.

### Alert Ingestion (Epic 1)
- What CloudEvent `ce-type` taxonomy for SOC alerts? Follow OCSF (Open Cybersecurity Schema Framework)?
- How to normalise heterogeneous alert formats (Splunk CEF, CrowdStrike JSON, Suricata EVE)?

### Case Architecture (Epic 2)
- One case definition per incident type (phishing, ransomware, insider threat) or one generic with adaptive branches?
- Does an incident map 1:1 to a CaseInstance, or can multiple incidents consolidate into one case?

### Enrichment (Epic 3)
- Which threat feeds to integrate first? VirusTotal (commercial), OTX (free), MISP (self-hosted)?
- How to handle conflicting intelligence (Feed A says malicious, Feed B says benign)?

### Containment (Epic 4)
- Where do we draw the line between auto-approve and always-gate? What's the confidence threshold?
- How to handle containment rollback (un-isolate a host that was wrongly isolated)?

### Trust (Epic 5)
- Trust per ATT&CK tactic (14 dimensions) or per technique (200+)? Start with tactics, refine later?
- How to handle cold-start for the first incident with no trust history?

### CBR (Epic 6)
- Which CaseMemoryStore backend for production? JPA FTS sufficient, or need vector search from day one?
- How to represent incident similarity — feature vector dimensions and weights?

### LLM Agents (Epic 9)
- Which investigation tasks benefit from LLM vs rule-based agents? Where's the crossover point?
- How to prevent LLM hallucination in incident response context? CRAG + NLI faithfulness checking?
