# Platform Capability Inventory for casehub-soc

**Date:** 2026-06-29
**Purpose:** Map every CaseHub foundation capability to SOC use cases. This document is the bridge between the platform (what exists) and our domain (what we need). Every implementation decision references this inventory.

---

## Reading Guide

For each module:
- **Capabilities** — what the module provides
- **SOC Use Cases** — how SOC uses each capability
- **SPIs to Consume** — interfaces we inject and call
- **SPIs to Implement** — interfaces we provide implementations for
- **Wiring** — concrete CDI/classpath activation steps
- **Gaps** — things SOC needs that the module doesn't provide (→ parent issues)

---

## 1. casehub-platform

### 1.1 Identity — `CurrentPrincipal`

**What it provides:** Actor/tenant/groups/roles resolution. `actorId()`, `groups()`, `tenancyId()`, `roles()` (defaults to `groups()`).

**SOC use cases:**
- **Analyst identity:** Associate every triage decision, containment approval, and investigation action with the acting analyst or agent
- **Tenant isolation:** Multi-tenant SOC-as-a-Service — each customer org sees only their incidents
- **Role-based access:** `@RolesAllowed("soc-manager")` gates containment approval endpoints; `@RolesAllowed("tier3-analyst")` gates threat hunting tools
- **Agent identity:** AI agents use format `{model-family}:{persona}@{major}` (e.g., `claude:triage-agent@v1`) — consistent with ledger trust scoring identity

**SPIs to consume:** `CurrentPrincipal` (inject via CDI)
**SPIs to implement:** None — use `MockCurrentPrincipal` (dev), `OidcCurrentPrincipal` (prod via classpath)
**Wiring:** Add `casehub-platform-oidc` for production OIDC. Add `casehub-platform-testing` for test fixtures.

### 1.2 Preferences — `PreferenceKey<T>`

**What it provides:** Typed, scope-hierarchical business configuration. Resolved per-request against scope path (`casehubio → soc → phishing-triage`).

**SOC use cases:**
- **Alert severity thresholds:** `PreferenceKey<Integer>("soc", "autoTriageThreshold", 70, Integer::parseInt)` — alerts above this confidence auto-promote to incidents
- **Containment auto-approval:** `PreferenceKey<Boolean>("soc", "autoContainLowRisk", false, Boolean::parseBoolean)` — whether low-risk containments skip human approval
- **SLA windows:** `PreferenceKey<Duration>("soc", "p1ResponseWindow", Duration.ofMinutes(15), Duration::parse)` — DORA/SOC2 response deadlines
- **Trust routing thresholds:** Per-ATT&CK tactic trust minimum for agent routing
- **CBR similarity threshold:** Minimum similarity score for retrieved past incidents to be surfaced

**SPIs to consume:** `PreferenceProvider` (read-only), `PreferenceKey<T>` (define keys in `api/`)
**SPIs to implement:** None — use `MockPreferenceProvider` backed by `application.properties`
**Wiring:** Define `PreferenceKey` constants in `api/`. Keys use `qualifiedName()` as map key (never the object itself).

### 1.3 Memory — `CaseMemoryStore`

**What it provides:** Cross-case recall. Facts from resolved incidents available to future triage. Pluggable backends: JPA/FTS, SQLite/FTS5, Mem0 (vector), Graphiti (knowledge graph).

**SOC use cases:**
- **CBR Retain phase:** At incident closure, write `MemoryInput` with problem features (IOCs, ATT&CK techniques, severity), solution (playbook executed, containment actions taken), outcome (true positive? false positive? dwell time?)
- **CBR Retrieve phase:** New alert arrives → query `CaseMemoryStore` for similar past incidents by feature vector
- **Entity context injection:** When an IP/domain/hash is encountered, recall everything we know about it from prior incidents (like AML's `AmlPriorContext` pattern)
- **Threat actor tracking:** Temporal knowledge graph (Graphiti backend) tracks attacker campaigns across incidents over time

**SPIs to consume:** `CaseMemoryStore` (blocking), `ReactiveCaseMemoryStore` (reactive), `GraphCaseMemoryStore` (temporal queries)
**SPIs to implement:** None — choose backend by classpath dependency
**Wiring:**
- Dev/test: `memory-inmem` (volatile `ConcurrentHashMap`)
- Production initial: `memory-jpa` (PostgreSQL FTS — structured queries)
- Production future: `memory-mem0` (semantic vector search) or `memory-graphiti` (temporal reasoning)

**Backend selection rationale:**
- Start with `memory-jpa` — structured queries by ATT&CK technique, IOC type, severity are sufficient for MVP
- Graduate to `memory-mem0` when we need "alerts similar to this description" semantic search
- Graduate to `memory-graphiti` when we need temporal campaign tracking ("what happened to this threat actor over the last 6 months?")

### 1.4 Agents — `AgentProvider`

**What it provides:** LLM agent invocation and multi-turn sessions. Claude CLI subprocess, LangChain4j bridge, MCP tool integration.

**SOC use cases:**
- **LLM-powered triage agent:** Multi-turn session analysing an alert, querying threat feeds, recommending severity
- **Threat narrative synthesis:** Agent reads raw log data, produces analyst-readable incident summary
- **Automated IOC correlation:** Agent queries STIX/TAXII feeds, correlates with internal IOC database, maps to ATT&CK
- **Playbook generation:** Agent reads past incident post-mortems, proposes response playbook for new incident type
- **Natural language analyst interface:** Analyst asks "what's the risk of this IP?" — agent queries memory, feeds, and responds

**SPIs to consume:** `AgentProvider`, `AgentSession`, `AgentMcpServer`
**SPIs to implement:** Domain-specific MCP tools (e.g., `query_iocs`, `get_incident_context`, `classify_alert`)
**Wiring:** Add `casehub-platform-agent-claude` for Claude sessions. `NoOpAgentProvider @DefaultBean` active without it.

### 1.5 Streaming — CloudEvents ingestion

**What it provides:** SIEM/EDR/IDS alert ingestion via Kafka, AMQP, webhook, polling, Camel adapters. All events arrive as `io.cloudevents.CloudEvent`.

**SOC use cases:**
- **SIEM webhook adapter:** Splunk/Elastic/QRadar forwards alerts via webhook → `CloudEvent` → SOC triage pipeline
- **EDR event stream:** CrowdStrike/SentinelOne/Defender alerts via Kafka → SOC
- **Threat feed polling:** STIX/TAXII feeds polled on schedule → IOC enrichment
- **IDS/IPS alerts:** Suricata/Snort via syslog/Kafka → SOC

**SPIs to consume:** Stream adapter SPIs (Kafka, webhook, poll, Camel)
**SPIs to implement:** SOC-specific `CloudEvent` type handlers (route `ce-type=soc.alert.siem` to triage)
**Wiring:** Add appropriate stream submodule (`casehub-platform-stream-kafka`, `casehub-platform-stream-webhook`, etc.)

### 1.6 Expression — `JQEvaluator`

**What it provides:** JQ expression evaluation against JSON data. Used by engine bindings and work queue filters.

**SOC use cases:**
- **Alert routing rules:** JQ expressions in case definition bindings — `.severity >= "HIGH" and .source == "crowdstrike"`
- **Context extraction:** `inputMapping` / `outputMapping` in case definitions
- **Queue filters:** SOC analyst queue views filtered by alert type, severity, ATT&CK tactic

**SPIs to consume:** `JQEvaluator` (utility module, no SPI implementation needed)

### 1.7 Endpoints — `EndpointRegistry`

**What it provides:** Tenant-scoped endpoint descriptors for dynamic integration target discovery.

**SOC use cases:**
- **EDR endpoint registry:** Register CrowdStrike/SentinelOne API endpoints per tenant for containment execution
- **SIEM endpoint registry:** Register Splunk/Elastic endpoints per tenant for log queries
- **Threat feed endpoints:** Register MISP/OTX/VirusTotal per tenant

**SPIs to consume:** `EndpointRegistry`
**SPIs to implement:** None — use `endpoints-config` for YAML-based static population, `endpoints-memory` for runtime
**Wiring:** Add `casehub-platform-endpoints-config` + YAML files describing per-tenant endpoints

---

## 2. casehub-ledger

### 2.1 Tamper-Evident Audit Trail

**What it provides:** Immutable, hash-chained (Merkle Mountain Range, RFC 9162) audit records. Consumer-subclassed `LedgerEntry` entities. Inclusion proofs for external verification.

**SOC use cases:**
- **Incident response audit:** Every triage decision, investigation step, and containment action is a `LedgerEntry` with `causedByEntryId` chain — full decision provenance
- **Compliance evidence (SOC2/DORA/NIS2):** Auditors verify that containment was authorized, SLA was met, and the response chain is unaltered
- **Forensic evidence custody:** `ForensicEvidenceLedgerEntry` tracks chain of custody for digital evidence
- **GDPR Art.22 decision records:** Automated triage decisions recorded with full rationale for data subject access requests

**SOC-specific `LedgerEntry` subclasses to create:**
| Entry Type | Records | `causedByEntryId` links to |
|---|---|---|
| `AlertTriageLedgerEntry` | Alert received, severity assigned, triage decision | Stream ingestion event |
| `IncidentPromotedLedgerEntry` | Alert promoted to incident | `AlertTriageLedgerEntry` |
| `InvestigationStepLedgerEntry` | Agent performed investigation action | Previous investigation step |
| `ContainmentDecisionLedgerEntry` | Containment action approved/rejected | Human WorkItem completion |
| `ContainmentExecutedLedgerEntry` | Containment action executed | `ContainmentDecisionLedgerEntry` |
| `IncidentResolvedLedgerEntry` | Incident closed with outcome | Final investigation step |

**SPIs to consume:** `LedgerEntryRepository`, `LedgerVerificationService` (inclusion proofs), `LedgerMerkleFrontierRepository`
**SPIs to implement:** LedgerEntry subclasses (JPA `@Entity` + `@DiscriminatorValue`), CDI observers to capture domain events
**Wiring:**
1. Subclass `LedgerEntry` in `app/` with `@DiscriminatorValue`
2. Flyway migration V1011+ for join tables at `classpath:db/ledger/migration`
3. `@ObservesAsync` CDI observers to persist entries on domain events

### 2.2 Trust Scoring — Bayesian Beta + EigenTrust

**What it provides:** Per-actor, per-capability, per-dimension trust scores. Beta(α,β) prior updated by attestations. EigenTrust for peer-weighted propagation. Four trust types: GLOBAL, CAPABILITY, DIMENSION, CAPABILITY_DIMENSION.

**SOC use cases:**
- **Agent triage accuracy:** Trust score per triage agent per ATT&CK tactic category — "how accurate is this agent at classifying phishing vs credential access?"
- **Analyst performance:** Trust dimensions for investigation thoroughness, false positive rate, response speed
- **Playbook effectiveness:** Trust scores for playbooks — "how often does this playbook lead to successful containment for ransomware incidents?"
- **Cold start handling:** New agents start at Beta(1,1) = 0.5 prior. Trust maturity model: BOOTSTRAP → BORDERLINE → QUALIFIED → EXCLUDED

**SOC trust dimensions to define:**
| Dimension | What it measures | Updated by |
|---|---|---|
| `triage-accuracy` | Was the severity classification correct? | Post-incident review attestation |
| `investigation-thoroughness` | Were all relevant IOCs identified? | Peer review attestation |
| `containment-effectiveness` | Did the containment action stop the threat? | Outcome tracking |
| `false-positive-rate` | How often does this agent raise false alarms? | Post-triage review |

**SPIs to consume:** `TrustScoreSource` (via `TrustGateService`), `ActorTrustScoreRepository`
**SPIs to implement:** Domain-specific `CommitmentAttestationPolicy` (override DONE→SOUND/FAILURE→FLAGGED defaults)
**Wiring:** Add `casehub-engine-ledger` to classpath → `TrustWeightedAgentStrategy` activates at Priority 1

### 2.3 GDPR Erasure

**What it provides:** Token-severing erasure. `ErasureReceiptLedgerEntry` for tamper-evident erasure audit. `DecisionContextSanitiser` SPI for PII stripping.

**SOC use cases:**
- **Suspect PII in forensic logs:** GDPR Art.17 request for a person who was investigated but cleared — erase their PII from incident records while preserving the structural audit trail
- **Employee data in insider threat investigations:** If investigation concludes no wrongdoing, erase personal data
- **PII sanitisation:** Strip analyst names, suspect identifiers from decision context before ledger storage

**SPIs to consume:** `LedgerErasureService`, `ErasureReceiptLedgerEntry`
**SPIs to implement:** `DecisionContextSanitiser` — strip SOC-specific PII (IP addresses, email addresses, names) from decision context JSON
**Wiring:** Enable via `casehub.ledger.erasure-receipt.enabled=true`

### 2.4 W3C PROV-DM Lineage

**What it provides:** Standards-compliant provenance data model export. `ProvenanceSupplement` captures source entity and workflow reference.

**SOC use cases:**
- **Regulatory filing:** Export incident decision chain as PROV-DM for DORA/NIS2 competent authority reports
- **Forensic evidence lineage:** Prove that evidence X was collected by agent Y as part of investigation Z

**SPIs to consume:** `ProvenanceSupplement` (attach to ledger entries)
**Wiring:** Attach `ProvenanceSupplement` to investigation and containment ledger entries

---

## 3. casehub-engine

### 3.1 Case Orchestration

**What it provides:** Hybrid choreography + orchestration engine. Declarative case definitions (YAML). Blackboard architecture (CMMN). Binding targets: capability workers, sub-cases, human tasks.

**SOC use cases:**
- **Incident investigation as a case:** Each confirmed incident becomes a `CaseInstance`. The case definition drives the investigation workflow — triage → enrichment → investigation → containment → resolution
- **Playbook execution:** YAML case definitions encode SOC playbooks — phishing playbook, ransomware playbook, insider threat playbook
- **Adaptive investigation:** Context-change triggers activate investigation steps based on findings — "if ATT&CK technique is lateral movement, activate network segmentation binding"
- **Sub-case decomposition:** Complex incidents spawn sub-cases — one per affected system, each with its own investigation and containment path

**Key engine concepts for SOC:**
| Concept | SOC Mapping |
|---|---|
| `CaseInstance` | Active incident investigation |
| `CaseDefinition` (YAML) | SOC playbook |
| Binding with `capability` target | Route investigation task to specialist agent |
| Binding with `humanTask` target | Create analyst WorkItem for approval/review |
| Binding with `subCase` target | Decompose multi-system incident |
| `contextChange` trigger | React to investigation findings |
| `when` guard | Gate containment on risk classification |

**SPIs to consume:** `CaseHubRuntime`, `CaseInstanceRepository`, `PlanItemStore`
**SPIs to implement:**
- `WorkerProvisioner` — provision SOC agents (Claude sessions or rule-based workers)
- `CaseChannelProvider` — wire SOC channels to Qhorus
- `WorkerContextProvider` — build investigation context from ledger lineage
- `ActionRiskClassifier` — classify containment actions by risk level

**Wiring checklist:**
1. Define `CaseDefinition.yaml` per playbook (phishing, ransomware, insider threat, etc.)
2. Implement `WorkerProvisioner` — delegates to `AgentProvider` for LLM agents
3. Add `casehub-engine-work-adapter` + `casehub-engine-blackboard` for human tasks
4. Add `casehub-engine-ledger` for trust-weighted routing
5. Implement `@RiskClassifier` for containment action gating

### 3.2 Agent Routing

**What it provides:** Pluggable routing strategies. Three built-in: `LeastLoadedAgentStrategy` (Priority 0), `TrustWeightedAgentStrategy` (Priority 1, classpath-activated), `SemanticAgentRoutingStrategy` (Priority 2, classpath-activated).

**SOC use cases:**
- **Trust-weighted triage routing:** Route phishing alerts to agents with highest `triage-accuracy` trust score for the `initial-access` ATT&CK tactic
- **Semantic routing:** Match "suspicious PowerShell execution" alert description to agent whose capability embedding is closest
- **Capability health gating:** Skip agents whose EDR API connection is `Unavailable`
- **Fallback chain:** Trust routing → semantic routing → least-loaded (never block on missing trust data)

**SPIs to consume:** `AgentRoutingStrategy`, `AgentRoutingContext`, `AgentCandidate`
**SPIs to implement:** None — use platform strategies. Possibly `TrustRoutingPolicyProvider` (like AML's `AmlTrustRoutingPolicyProvider`) for per-capability policies
**Wiring:** Add `casehub-engine-ledger` (trust) and optionally `casehub-engine-ai` (semantic) to classpath

### 3.3 Action Risk Classification

**What it provides:** Oversight gate for consequential actions. Workers return `WorkerResult` with optional `PlannedAction`. If present, engine creates a WorkItem for human approval before advancing.

**SOC use cases:**
- **Containment gates:** Isolating a production server, revoking executive credentials, blocking a partner IP — all require SOC manager approval
- **Reversibility-based classification:** Reversible actions (enable enhanced logging, rotate API keys) → auto-approve. Irreversible actions (network isolation, credential revocation) → human gate
- **Risk score threshold:** Actions on critical assets (domain controllers, CI/CD pipelines) → always gate. Actions on low-value assets → gate only if confidence is below threshold

**SOC action type vocabulary (following AML's `AmlActionType` pattern):**
| Action Type | Gate Policy | Reversible? | Candidate Groups |
|---|---|---|---|
| `ENABLE_ENHANCED_LOGGING` | NEVER | Yes | — |
| `ROTATE_API_KEY` | CONFIDENCE_THRESHOLD | Yes | `tier2-analyst` |
| `BLOCK_IP` | RISK_SCORE_THRESHOLD | Partial | `tier2-analyst` |
| `ISOLATE_HOST` | ALWAYS | No | `soc-manager` |
| `REVOKE_CREDENTIALS` | ALWAYS | No | `soc-manager` |
| `NETWORK_SEGMENTATION` | ALWAYS | No | `soc-manager`, `network-ops` |
| `WIPE_ENDPOINT` | ALWAYS | No | `soc-manager`, `ciso` |

**SPIs to implement:** `ActionRiskClassifier` with `@RiskClassifier` qualifier
**Critical:** Binding guards must exclude gate signal paths to prevent re-scheduling loops:
```
.on(new ContextChangeTrigger(".result == null and .actionGateRejected == null and .actionGateApproved == null"))
```

### 3.4 Signal Delivery

**What it provides:** Three entry points for external signals to mutate running cases: SLA escalation (via `CaseSignalSink`), Qhorus messages (via `QhorusMessageSignalBridge`), direct REST.

**SOC use cases:**
- **SLA escalation:** P1 incident not triaged within 15 minutes → escalate to SOC manager → re-route to senior analyst
- **Threat feed update:** External STIX/TAXII feed reports new IOC matching active incident → inject signal → trigger re-investigation
- **EDR containment confirmation:** EDR API confirms host isolated → signal → advance case past containment wait
- **Analyst DECLINE/FAILURE:** Agent cannot investigate (capability degraded) → signal → re-route to next agent

**SPIs to consume:** `CaseSignalSink` (already implemented in `casehub-engine-work-adapter`)
**Wiring:** `QhorusMessageSignalBridge` translates DONE/FAILURE/DECLINE/RESPONSE on `case-{caseId}/{purpose}` channels automatically

---

## 4. casehub-work

### 4.1 WorkItem Lifecycle

**What it provides:** 10-status human task lifecycle (PENDING → ASSIGNED → IN-PROGRESS → COMPLETED/CANCELLED/EXPIRED/DELEGATED/REJECTED/ON-HOLD/CLAIM-EXPIRED). CDI lifecycle events with named outcomes. Queue views with JEXL/JQ filters.

**SOC use cases:**
- **Analyst triage review:** Tier-1 analyst receives WorkItem to review auto-triaged alert. Outcomes: `CONFIRM_SEVERITY`, `DOWNGRADE`, `ESCALATE`, `FALSE_POSITIVE`
- **Containment approval:** SOC manager receives WorkItem to approve containment action. Outcomes: `APPROVE`, `REJECT`, `MODIFY_AND_APPROVE`
- **Forensic evidence review:** Tier-3 analyst reviews collected forensic evidence. Outcomes: `SUFFICIENT`, `NEED_MORE_EVIDENCE`, `SEND_TO_EXTERNAL_FORENSICS`
- **Compliance sign-off:** Compliance officer reviews incident report before filing with regulator

**SPIs to consume:** `WorkItemCreator`, `WorkItemLifecycle`, `SlaBreachPolicy`
**SPIs to implement:**
- `SlaBreachPolicy` — SOC-specific escalation chains (P1: 15min→SOC manager, P2: 1hr→senior analyst, P3: 24hr→team lead)
- `WorkerSelectionStrategy` — possibly domain-specific routing (e.g., route insider threat reviews to analysts outside the suspect's department)
- `ExclusionPolicy` — analysts cannot review incidents involving their own credentials or systems they administer

**Wiring:** Add `casehub-work` runtime. Define templates with outcomes, SLA, candidate groups.

### 4.2 SLA Breach Policies

**What it provides:** `SlaBreachPolicy.onBreach(SlaBreachContext) → BreachDecision`. Decisions: Fail, EscalateTo(groups, deadline), Extend(by), Chained.

**SOC SLA tiers:**
| Priority | Claim SLA | Completion SLA | Breach Action |
|---|---|---|---|
| P1 (Critical) | 5 min | 15 min | Escalate → SOC manager, new deadline 30 min |
| P2 (High) | 15 min | 1 hr | Escalate → senior analyst, new deadline 2 hr |
| P3 (Medium) | 1 hr | 24 hr | Extend by 12 hr, then escalate |
| P4 (Low) | 4 hr | 72 hr | Extend by 24 hr, then fail |

**SPIs to implement:** `SlaBreachPolicy` — chained policy with escalation → extension → fail
**Wiring:** Define `scope` in WorkItem templates for preference-resolved SLA windows

### 4.3 M-of-N Coordination

**What it provides:** Homogeneous parallel group completion. M of N child WorkItems must complete to satisfy a group.

**SOC use cases:**
- **Multi-analyst consensus:** 2-of-3 analysts must confirm severity classification before containment proceeds
- **Cross-team approval:** Both SOC manager and network ops must approve network segmentation (2-of-2)
- **Evidence collection:** 3 forensic tasks (memory dump, disk image, network capture) — all 3 must complete (3-of-3)

**SPIs to consume:** `MultiInstanceCoordinator`, child WorkItem queries with group progress
**Wiring:** Use `SpawnPort.spawn()` for child WorkItems

---

## 5. casehub-qhorus

### 5.1 Agent Communication

**What it provides:** 9 speech-act message types, 5 channel semantics, normative channel layout (work/observe/oversight). All writes via `MessageService.dispatch()` enforcement gate (ACL, rate limit, ledger, fan-out).

**SOC channel mapping:**
| Channel | Purpose | Writers | Readers |
|---|---|---|---|
| `/work` | Task dispatch — "investigate this alert", "correlate these IOCs" | Engine (COMMAND), agents (DONE/FAILURE/DECLINE/RESPONSE) | Assigned agents |
| `/observe` | Telemetry — investigation progress, IOC discoveries, threat feed updates | Agents (EVENT) | All participants |
| `/oversight` | Governance — containment approval requests, compliance review | Engine (COMMAND), SOC managers (RESPONSE) | SOC managers |

**SOC message flows:**
1. Engine sends COMMAND on `/work`: "Investigate alert #12345 — possible credential harvesting"
2. Agent sends STATUS: "Querying CrowdStrike for endpoint telemetry..."
3. Agent sends RESPONSE with investigation findings (IOCs, ATT&CK mapping)
4. Agent sends DONE (investigation complete) or FAILURE (cannot investigate — EDR API down)
5. If containment needed: Engine sends COMMAND on `/oversight`: "Approve host isolation for SERVER-042"
6. SOC manager sends RESPONSE on `/oversight`: APPROVE/REJECT with rationale

**SPIs to consume:** `MessageService.dispatch()`, `ChannelProjection<S>`, `CommitmentAttestationPolicy`
**SPIs to implement:**
- `ChannelProjection<IncidentState>` — fold investigation messages into typed incident state
- `CommitmentAttestationPolicy` — SOC-specific attestation rules (DONE on investigation → SOUND; FAILURE due to API timeout → don't flag agent as unreliable)
- Potentially a custom `ChannelBackend` for debate-style threat assessment

**Wiring:** Requires named `qhorus` datasource (never shared with domain tables). Configure `TenancyContextFilter`.

### 5.2 Commitment Tracking

**What it provides:** 7-state commitment lifecycle (OPEN → FULFILLED/FAILED/EXPIRED/DECLINED/DELEGATED/ACKNOWLEDGED). Tracks obligation fulfilment per agent.

**SOC use cases:**
- **Investigation SLA tracking:** COMMAND creates commitment with deadline. If agent doesn't respond within SLA, commitment expires → trigger escalation
- **Containment obligation:** Containment COMMAND creates commitment. DONE = containment executed. FAILURE = containment failed (e.g., EDR API error)
- **Trust signal:** Commitment outcomes feed trust scoring — agents that consistently DECLINE are tracked via `CapabilitySpecializationStore`

**SPIs to consume:** `CommitmentStore`, commitment CDI events (`CommitmentDeclinedEvent`, `CommitmentExpiredEvent`)

### 5.3 Deliberation Channels (Future — casehub-drafthouse patterns)

**What it provides (from casehub-drafthouse):** Debate channels with multi-agent structured analysis. Review channels with reactive LLM assessment.

**SOC use cases (future):**
- **Threat assessment debate:** Multiple agents debate alert severity — one argues credential harvesting, another argues benign password reset. Round-based structured analysis produces consensus
- **Investigation review:** Senior analyst submits investigation report → LLM reviewer auto-generates critique (gaps, missed IOCs, alternative hypotheses)
- **Consensus containment approval:** M-of-N vote on whether to proceed with containment (consensus gate pattern)

**Gap:** Debate and review backends live in casehub-drafthouse. SOC would either depend on drafthouse or propose extracting these to casehub-blocks.

---

## 6. casehub-eidos

### 6.1 Agent Identity — `AgentDescriptor`

**What it provides:** Four-layer agent descriptor (identity, slot, capabilities, disposition). AgentRegistry for discovery. CapabilityHealth probes. System prompt rendering.

**SOC agent descriptors:**
| Agent | Slot | Capabilities | Disposition |
|---|---|---|---|
| `claude:alert-triage@v1` | `triage-analyst` | `alert-classification`, `severity-assessment` | autonomy: guided, riskAppetite: conservative |
| `claude:threat-intel@v1` | `intelligence-analyst` | `ioc-correlation`, `attck-mapping`, `feed-enrichment` | autonomy: autonomous, conflictMode: collaborative |
| `claude:containment@v1` | `incident-responder` | `host-isolation`, `credential-revocation`, `network-segmentation` | autonomy: supervised, riskAppetite: cautious |
| `claude:forensics@v1` | `forensic-analyst` | `evidence-collection`, `timeline-reconstruction`, `memory-analysis` | autonomy: autonomous, riskAppetite: cautious |
| `rule:siem-classifier` | `triage-analyst` | `alert-classification` | (non-LLM — Drools-based) |

**Capability tags aligned with ATT&CK tactics:**
`reconnaissance`, `initial-access`, `execution`, `persistence`, `privilege-escalation`, `defense-evasion`, `credential-access`, `discovery`, `lateral-movement`, `collection`, `command-and-control`, `exfiltration`, `impact`

**SPIs to consume:** `AgentRegistry`, `CapabilityHealth`, `SystemPromptRenderer`
**SPIs to implement:**
- `CapabilityHealth` — probe EDR/SIEM API connectivity before routing investigation tasks
- `AgentDescriptor` registrations — register SOC agent fleet at startup
- `CapabilitySpecializationStore` — track which agents DECLINE specific ATT&CK techniques

**Wiring:** Add `casehub-eidos` runtime + `casehub-eidos-memory` for tests. Add `casehub-eidos-vocab` for Belbin/DISC vocabularies.

### 6.2 Agent Graph — Outcome Tracking

**What it provides:** `AgentGraphStore` writes task outcomes. `AgentGraphQuery` reads outcome stats. Enables analysis of agent performance patterns.

**SOC use cases:**
- **Agent performance dashboard:** Which agents have the highest investigation success rate for ransomware incidents?
- **Decline pattern detection:** Agent X consistently declines lateral movement investigations → adjust capability registration or retrain
- **Workload analysis:** Agent Y handling 3x more investigations than peers → rebalance routing

**SPIs to consume:** `AgentGraphStore` (write outcomes), `AgentGraphQuery` (read stats)
**Wiring:** Add `casehub-eidos-graph` to classpath

---

## 7. casehub-neural-text

### 7.1 RAG Pipeline — `CaseRetriever`

**What it provides:** Hybrid retrieval (dense ONNX embeddings + sparse SPLADE) fused via RRF. Qdrant vector backend. Tenant-isolated corpus. CRAG quality self-correction.

**SOC use cases:**
- **CBR Retrieve phase:** Query "alerts similar to this phishing attempt targeting executive email" → retrieve past incidents by semantic similarity
- **Threat intelligence retrieval:** Query internal threat intel corpus for reports matching current IOC pattern
- **Playbook retrieval:** "What playbook was used for similar ransomware incidents?" → retrieve by incident description
- **Analyst knowledge base:** Natural language queries against accumulated SOC knowledge

**SOC feature vectors for retrieval:**
```
alert_type, source_system, attck_technique_id, target_asset_criticality,
ioc_types_present, time_of_day_pattern, threat_actor_attribution,
severity_outcome, investigation_duration, containment_success
```

**SPIs to consume:** `CaseRetriever` / `ReactiveCaseRetriever`
**SPIs to implement:** None — use `HybridCaseRetriever` with Qdrant backend
**Wiring:**
1. Add `casehub-neural-text-rag` + `casehub-neural-text-rag-crag` (corrective filtering)
2. Configure Qdrant connection
3. Define `CorpusRef` per tenant for incident corpus
4. Set up `EmbeddingIngestor` pipeline for incident data

### 7.2 Classification — `TextClassifier`

**What it provides:** ONNX-based text classification. NLI (natural language inference) for output faithfulness. Cross-encoder reranking.

**SOC use cases:**
- **Alert classification:** Classify raw alert text into ATT&CK technique categories using ONNX model (faster than LLM for high-volume triage)
- **Severity assessment:** NLI-based confidence scoring — "how confident is the classification model in this severity assignment?"
- **Reranking retrieved incidents:** Cross-encoder reranking of CBR-retrieved past incidents for precision

**SPIs to consume:** `TextClassifier`, `NliClassifier`, `CrossEncoderReranker`
**Wiring:** Add `casehub-neural-text-inference` + `casehub-neural-text-inference-runtime` for ONNX models

---

## 8. casehub-connectors

### 8.1 External Integration

**What it provides:** Outbound (Slack, Teams, SMS, email) and inbound (webhook, IMAP) connectors. MCP notification tools for LLM agents. `ConnectorDiscovery` SPI for dynamic target enumeration.

**SOC use cases:**
- **Analyst notifications:** Slack/Teams message when P1 incident assigned — "You've been assigned incident #12345: Possible ransomware on SERVER-042"
- **Escalation notifications:** SMS to on-call SOC manager when SLA breach imminent
- **Inbound alert channel:** Webhook endpoint for SIEM alert forwarding
- **MCP tools for agents:** `send_slack("soc-alerts", "Host SERVER-042 isolated successfully")` — LLM agents notify human operators

**SPIs to consume:** `Connector` SPI, `ConnectorService.send()`, `ConnectorDiscovery`
**SPIs to implement:** SOC-specific `Connector` for EDR API integration (CrowdStrike, SentinelOne, etc.) — unless these are better modeled as workers
**Wiring:** Add `casehub-connectors` + desired connector submodules (Slack, Teams, etc.)

---

## 9. casehub-worker

### 9.1 Worker Primitives

**What it provides:** `Worker`, `Capability`, `WorkerFunction` (strategy interface). `WorkerResult` with outcome, `PlannedAction` for follow-on actions.

**SOC use cases:**
- **Investigation workers:** `WorkerFunction` implementations that query EDR APIs, correlate IOCs, parse logs
- **Containment workers:** `WorkerFunction` that calls EDR API to isolate host, revoke credentials
- **Enrichment workers:** `WorkerFunction` that queries VirusTotal, AbuseIPDB, Shodan for IOC enrichment

**SPIs to implement:** `WorkerFunction` — one per SOC capability (alert-classification, ioc-enrichment, host-isolation, etc.)
**Wiring:** Workers register capabilities. Engine routes by capability match + trust score.

---

## 10. casehub-ops (Compliance Module)

### 10.1 Compliance Frameworks

**What it provides:** 6 compliance frameworks (SOC2, GDPR, EU AI Act, DORA, NIS2, ISO27001). `EvidenceCollector` → `ComplianceLedgerEntry`. Evidence-based drift detection — staleness triggers reconciliation.

**SOC use cases:**
- **SOC2 Type II evidence:** Automated evidence collection — "all containment actions have approval records" → collect WorkItem completion events
- **DORA incident reporting:** "all P1 incidents triaged within mandatory timeframe" → collect SLA compliance data
- **NIS2 incident detection:** "security incidents detected and classified within required window" → collect triage timing
- **GDPR Art.22:** "automated decisions affecting individuals have audit records" → collect automated triage decisions with rationale

**SPIs to consume:** `EvidenceCollector`, compliance framework definitions
**SPIs to implement:** SOC-specific evidence collectors that pull data from incident case lifecycle events
**Wiring:** Add `casehub-ops` compliance module

---

## Platform Gaps — Items to Propose as Parent Issues

### Gap 1: Real-Time Event Correlation
**Need:** Sliding window correlation — multiple low-severity alerts from different sources within a time window → high-severity incident
**Current state:** `casehub-ras` provides situational awareness via `Ganglion` detection strategies, but temporal pattern detection (Drools CEP, sliding windows) is not yet integrated
**Proposal:** Drools CEP integration in `casehub-ras` for temporal attack pattern detection

### Gap 2: `ImplementationRoutingStrategy`
**Need:** When multiple `TaskDefinition` implementations exist for the same capability (rule-based triage vs LLM triage), route to the one with best trust score
**Current state:** Gap documented in CBR-CAPABILITY.md. Application workaround via `canActivate()` gating
**Proposal:** `ImplementationRoutingStrategy` SPI in casehub-engine (symmetric to `AgentRoutingStrategy`)

### Gap 3: Debate/Review Channel Extraction
**Need:** SOC wants debate channels (multi-agent threat assessment) and review channels (automated investigation critique)
**Current state:** These live in casehub-drafthouse — extracting to casehub-blocks would make them reusable
**Proposal:** Extract debate and review channel backends to casehub-blocks

### Gap 4: Consensus Gate
**Need:** M-of-N approval gate for containment actions (not just homogeneous WorkItems, but structured voting with threshold)
**Current state:** Designed but not yet implemented (CHANNELS.md §3.1c)
**Proposal:** Implement `ConsensusChannelBackend` in casehub-qhorus or casehub-blocks

### Gap 5: Adaptive Plan Templates (CBR Revise Phase)
**Need:** Blend parameters from top-k retrieved past incidents into a concrete investigation plan
**Current state:** Long-term gap (CBR-CAPABILITY.md)
**No immediate action** — work around with static playbooks + manual analyst adaptation for now

---

## Dependency Summary

### Minimum Viable SOC (Epics 1-3)
```xml
<!-- Foundation -->
casehub-engine
casehub-engine-work-adapter
casehub-engine-blackboard
casehub-engine-ledger          <!-- trust-weighted routing -->
casehub-ledger
casehub-ledger-memory          <!-- test scope -->
casehub-work
casehub-qhorus
casehub-platform
casehub-platform-testing       <!-- test scope -->
casehub-worker

<!-- Stream ingestion -->
casehub-platform-stream-webhook    <!-- SIEM alert ingestion -->

<!-- Notifications -->
casehub-connectors                 <!-- analyst notifications -->
```

### Full SOC (Epics 4-7)
```xml
<!-- Add to above -->
casehub-eidos                      <!-- agent identity -->
casehub-eidos-graph                <!-- agent outcome tracking -->
casehub-neural-text-rag            <!-- CBR retrieval -->
casehub-neural-text-rag-crag       <!-- corrective retrieval -->
casehub-neural-text-inference      <!-- ONNX classification -->
casehub-ops                        <!-- compliance evidence -->
casehub-platform-agent-claude      <!-- LLM agent sessions -->
casehub-platform-memory-jpa        <!-- case memory persistence -->
```
