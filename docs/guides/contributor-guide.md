# casehub-soc -- Contributor Guide

> Internals, architecture, and extension points for platform contributors working on the Security Operations Center application.

**GitHub:** [casehubio/soc](https://github.com/casehubio/soc)

---

## Internal Architecture

### Layering Rule

If the capability requires knowledge of cybersecurity, threat intelligence, incident response, or compliance frameworks (SOC2, DORA, NIS2), it belongs here. If it is purely about cases, commitments, trust, or audit records, it belongs in the foundation. Never re-implement foundation primitives here.

This rule was formalised in ADR-001: no custom SecurityAlert or Incident entities. Alerts are CloudEvents routed via RAS. Incidents are CaseInstances. Investigation state lives in CaseContext. The app layer provides domain vocabulary, detection logic, risk classification, and declarative workflow only.

### Module Details

| Module | Artifact | Type | Purpose |
|---|---|---|---|
| `api/` | `casehub-soc-api` | Pure-Java SPI (no Quarkus, no JPA) | Domain model, SPI interfaces, capability tags, worker output contracts, `SiemAlertGanglion` |
| `app/` | `casehub-soc-app` | Quarkus application | Workers (6), case engine wiring, risk classifier, CDI producers, failure-review WorkItem creator, agent descriptor registrar |

Follows the standard CaseHub module tier structure: pure-Java SPI in api/, JPA + Quarkus in app/.

**api/ compile dependencies:** `casehub-platform-api`, `casehub-engine-api` (routing SPIs: `CandidateSetStrategy`, `StaticSetStrategy`), `casehub-ras-api` (Ganglion base classes), `casehub-eidos-api` (AgentDescriptor, AgentCapability, AgentDisposition), Mutiny (provided scope).

**app/ compile dependencies:** Full foundation stack -- see consumer guide Dependencies section.

---

## Source Layout

### api/src/main/java

```
io.casehub.soc
 +-- detection/
 |    +-- SiemAlertGanglion         -- JavaSwitchGanglion; classifies 6 SIEM/EDR CloudEvent types by severity
 |    +-- BruteForceDetectorGanglion -- JavaSwitchGanglion; classifies 4 auth failure CloudEvent types
 |    +-- BruteForceScorer          -- SPI interface; pluggable confidence scoring (default 0.9)
 +-- domain/
 |    +-- AlertSeverity             -- enum: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
 |    +-- AttackTactic              -- enum: 14 MITRE ATT&CK Enterprise tactics (TA0001-TA0043)
 |    +-- AttackTechnique           -- record: techniqueId (T####[.###]), name, tactic, subtechniqueOf
 |    +-- DoraResponseTimeReport    -- record: DORA metrics with per-priority PriorityStats
 |    +-- Ioc                       -- record: type, value, confidence, firstSeen, source, tags
 |    +-- IocType                   -- enum: 12 IOC types (IP_ADDRESS, FILE_HASH_*, DOMAIN, URL, etc.)
 |    +-- PriorityStats             -- record: count, avg triage/containment/resolution times, SLA compliance %
 |    +-- SocActionType             -- enum: 9 containment actions with GatePolicy, reversibility, candidateGroups
 |    +-- SocCapabilities           -- constants: soc:alert-classification, soc:ioc-correlation, etc.
 |    +-- SocCaseCapabilities       -- constants: case-YAML capability names (ioc-enrichment, attck-mapping, etc.)
 |    +-- SocCaseTypes              -- constants: incident-investigation
 |    +-- SocGroups                 -- constants: soc-tier1-analyst, soc-manager, soc-ciso, etc.
 |    +-- SocIncidentStatus         -- enum: TRIAGING, INVESTIGATING, CONTAINING, RESOLVED, ESCALATED, FALSE_POSITIVE
 |    +-- SocIncidentStatusChangedEvent -- record: CDI event for incident status transitions
 |    +-- SocPreferences            -- PreferenceKey constants: SLA response windows (P1-P4)
 |    +-- SocStepType               -- enum: 6 investigation step types for ledger entries
 |    +-- SocTrustDimensions        -- constants: triage-accuracy, containment-appropriateness
 |    +-- SocAgentDescriptors      -- static factory; AgentDescriptor per worker with MITRE ATT&CK epistemic domains
 +-- worker/contract/
      +-- IocEnrichmentOutput       -- record: iocs (list of IocEntry), summary
      +-- AttckMappingOutput        -- record: techniques (list of TechniqueEntry), primaryTactic, confidence, narrative
      +-- ContainmentRecommendationOutput -- record: recommendedAction, riskScore, confidenceScore, rationale, actionParameters
```

### app/src/main/java

```
io.casehub.soc
 +-- engine/
 |    +-- SocCaseHub                -- YamlCaseHub subclass; loads incident-investigation.yaml, augments with workers and agent descriptors
 |    +-- SocCaseInputContributor   -- CaseInputContributor; converts RAS detections to serialisable alert context
 |    +-- SocFaultedCaseReviewCreator -- CaseOutcomeObserver; creates failure-review WorkItems for FAULTED cases
 |    +-- SocGanglionProducer       -- CDI producer for SiemAlertGanglion (api/ is pure Java, no CDI)
 |    +-- SocInvestigationCaseDescriptor -- POJO; assembles the 6 workers for incident-investigation cases
 |    +-- SocAgentRegistrar         -- AgentDescriptorRegistrar SPI; registers descriptors with eidos AgentRegistry at startup
 |    +-- SocAttestationService     -- CaseOutcomeObserver; creates trust attestations on case resolution
 |    +-- SocIncidentStatusObserver -- CDI observer; tracks incident status transitions from CaseLifecycleEvent
 |    +-- cbr/
 |    |    +-- SocCbrRetainService   -- CaseOutcomeObserver; stores resolved incidents in CBR memory
 |    |    +-- SocCbrRetrieveService -- retrieves similar past incidents for triage enrichment
 |    |    +-- SocCbrCaseTypeRegistration -- CbrCaseTypeRegistration SPI; registers SOC case type
 |    |    +-- SocCbrSchemaRegistrar -- registers CBR schema attributes for SOC incidents
 |    |    +-- SocIncidentCbrCase   -- CbrCase record for SOC incidents
 |    |    +-- SocCaseOutcomeFilter -- shared predicate: successful SOC incident investigation
 |    +-- compliance/
 |    |    +-- SocLedgerEntry        -- JpaLedgerEntry subclass; incidentId + stepType (JOINED inheritance)
 |    |    +-- SocLedgerEntryWriter  -- shared write helper; validates metadata, manages sequence numbers
 |    |    +-- SocLedgerEntryRepository -- typed queries (by incident, time range, step type)
 |    |    +-- SocResolutionLedgerObserver -- CaseOutcomeObserver; writes INCIDENT_RESOLVED entries
 |    |    +-- SocIncidentLedgerObserver -- CDI observer; writes ALERT_TRIAGE, INCIDENT_PROMOTED entries
 |    |    +-- SocComplianceService -- DORA report aggregation, PII-sanitised timeline, inclusion proofs
 |    |    +-- SocPiiSanitiser      -- regex PII redaction (IPv4, IPv6, email); fail-closed
 +-- rest/
 |    +-- SocComplianceResource     -- JAX-RS: /api/soc/compliance/{proof,timeline,dora}; @RolesAllowed
 +-- routing/
 |    +-- SocActionRiskClassifier   -- ActionRiskClassifier with @RiskClassifier qualifier
 +-- worker/
      +-- IocExtractor              -- static utility; regex extraction (IPv4, MD5, SHA1, SHA256, domain, URL, email, CVE)
      +-- AttckLookupTable          -- static utility; rule prefix + IOC type -> ATT&CK technique mapping
      +-- ContainmentDecisionMatrix -- static utility; severity x tactic matrix -> containment recommendation
      +-- RuleIocEnrichmentWorker   -- Worker factory; ioc-enrichment capability, uses IocExtractor
      +-- RuleAttckMappingWorker    -- Worker factory; attck-mapping capability, uses AttckLookupTable
      +-- RuleContainmentRecommendationWorker -- Worker factory; containment-recommendation, uses ContainmentDecisionMatrix + PlannedAction
      +-- LlmIocEnrichmentWorker    -- Worker factory; ioc-enrichment, AgentWorkerFunction with IocEnrichmentOutput schema
      +-- LlmAttckMappingWorker     -- Worker factory; attck-mapping, AgentWorkerFunction with AttckMappingOutput schema
      +-- LlmContainmentRecommendationWorker -- Worker factory; containment-recommendation, WorkerFunction.Sync with PlannedAction extraction
      +-- SocAgentPrompts           -- constants: system prompts for the three LLM worker capabilities
```

### app/src/main/resources

```
application.properties                -- H2 dev defaults, Flyway (work + qhorus + soc), in-memory engine SPIs
META-INF/ras-situations.yaml          -- RAS situation definitions (3: siem-alert-critical, brute-force-by-source, credential-stuffing-by-target)
soc/incident-investigation.yaml       -- case definition YAML (3 capabilities, 4 bindings, 3 goals)
db/soc/migration/V5000__*.sql         -- SOC-specific Flyway migrations (V5000+ range, qhorus datasource)
```

---

## Design Philosophy

1. **CBR (Case-Based Reasoning)** -- incident triage designed as a CBR system from day one. Past incidents feed future triage. Uses `CaseRetriever` SPI. Plans for Retrieve/Reuse/Revise/Retain. (Layer 4b)

2. **Dual worker architecture** -- rule-based and LLM workers coexist for every capability. Registered as separate named `Worker` instances (NOT `@DefaultBean`/`@Alternative` -- CDI displacement is all-or-nothing). Bootstrap routing selects rule-based by insertion order. Trust-weighted routing (`ImplementationRoutingStrategy`) selects based on maturity scores once enough attestations accumulate.

3. **casehub-blocks candidates** -- SOC patterns (approval gate for containment, debate for threat assessment, escalation for analyst review) designed as blocks candidates. Implement locally first, then propose extraction to blocks.

4. **AI fusion** -- SPIs allow LLM-powered and rule-based agents to coexist with the same trust model. Threat narrative synthesis, automated IOC correlation, natural language incident summaries. LLM workers register with `noFunction()` when `langchain4j-anthropic` unavailable.

5. **Platform extension** -- if SOC needs something the platform does not have, file it as a parent issue. Push the platform forward; do not work around gaps silently.

6. **Pages UI** -- SOC application UI via casehub-pages. Incident timeline, agent trust scores, channel activity, case status. `hostPanel()` for custom SOC-specific components; DSL for data-bound visualisations. (Planned)

---

## Key Implementation Patterns

### Worker Registration Pattern

Workers are NOT CDI beans. They are plain Java objects assembled in `SocInvestigationCaseDescriptor` and injected into the case definition via `SocCaseHub.augment()`:

```java
// SocCaseHub.java
@ApplicationScoped
public class SocCaseHub extends YamlCaseHub {
    public SocCaseHub() {
        super("soc/incident-investigation.yaml");
    }

    @Override
    protected void augment(CaseDefinition definition) {
        var descriptor = new SocInvestigationCaseDescriptor();
        definition.getWorkers().addAll(descriptor.workers());
    }
}
```

`SocInvestigationCaseDescriptor` creates all 6 workers:
```java
List<Worker> workers() {
    return List.of(
        RuleIocEnrichmentWorker.create(),
        LlmIocEnrichmentWorker.create(llmModel),     // noFunction() if llmModel == null
        RuleAttckMappingWorker.create(),
        LlmAttckMappingWorker.create(llmModel),
        RuleContainmentRecommendationWorker.create(),
        LlmContainmentRecommendationWorker.create(llmModel));
}
```

### Worker Factory Pattern

Each worker is a static factory class. Rule-based workers use `Worker.builder().function(Map -> WorkerResult)`:

```java
public static Worker create() {
    return Worker.builder()
            .name("rule-ioc-enrichment")
            .capabilityName("ioc-enrichment")
            .function((Map<String, Object> input) -> {
                // ... extract IOCs from input.get("alert") ...
                return WorkerResult.of(Map.of("iocs", iocMaps, "summary", summary));
            })
            .build();
}
```

LLM workers use `AgentWorkerFunction` with a typed response schema (for IOC enrichment and ATT&CK mapping) or `WorkerFunction.Sync` with manual `PlannedAction` extraction (for containment -- engine#829 workaround):

```java
// IOC enrichment and ATT&CK mapping -- AgentWorkerFunction
var agent = Agent.builder()
    .systemPrompt(SocAgentPrompts.IOC_ENRICHMENT)
    .model(chatModel)
    .responseSchema(IocEnrichmentOutput.class)
    .build();
return Worker.builder()
    .name("llm-ioc-enrichment")
    .capabilityName("ioc-enrichment")
    .function(new AgentWorkerFunction(agent))
    .build();

// Containment -- WorkerFunction.Sync (engine#829 workaround)
return Worker.builder()
    .name("llm-containment-rec")
    .capabilityName("containment-recommendation")
    .fn((Map<String, Object>) null)
    .apply((input, scope) -> {
        WorkerResult<Map<String, Object>> agentResult = agent.execute(input);
        // ... extract PlannedAction from output ...
        return WorkerResult.of(output, action);
    })
    .build();
```

### Ganglion CDI Production Pattern

`SiemAlertGanglion` lives in api/ (pure Java, no CDI annotations). CDI production happens in app/ via `SocGanglionProducer`:

```java
@ApplicationScoped
public class SocGanglionProducer {
    @Produces @ApplicationScoped
    SiemAlertGanglion siemAlertGanglion() {
        return new SiemAlertGanglion();
    }
}
```

### Risk Classification Pattern

`SocActionRiskClassifier` follows casehub-aml's `AmlActionRiskClassifier` pattern:

1. Worker returns `WorkerResult` with `PlannedAction` (action type = `SocActionType.actionType()`, e.g. `isolate.host`)
2. Engine calls `SocActionRiskClassifier.classify(PlannedAction, ClassificationContext)`
3. Classifier looks up `SocActionType` by action type string
4. Returns `RiskDecision`: `Autonomous` (auto-approve), `GateRequired` (human approval WorkItem)
5. Unknown action types -> `Autonomous` (pass through)
6. Missing risk/confidence parameters -> fail-closed (`GateRequired`)

**Gate policy logic:**
- `NEVER` -> always autonomous
- `ALWAYS` -> always gated
- `RISK_SCORE_THRESHOLD` -> gated if `riskScore` >= 0.8 or missing
- `CONFIDENCE_THRESHOLD` -> gated if `confidenceScore` < 0.9 or missing

### CaseOutcomeObserver Pattern (Failure Review)

`SocFaultedCaseReviewCreator` implements `CaseOutcomeObserver` to react to case outcomes without contextChange bindings (which do not fire for FAULTED cases):

```java
@Override
public void onOutcome(CaseOutcomeEvent event) {
    if (!CaseStatus.FAULTED.name().equals(event.outcomeLabel())) return;
    if (!SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseType())) return;
    QuarkusTransaction.requiringNew().run(() -> processOutcome(event));
}
```

Key details:
- Runs in `requiringNew()` transaction (event observer context may already have a transaction)
- Idempotent via `callerRef` check (`case-faulted:{caseId}`)
- Priority derived from alert severity in case snapshot
- Permitted outcomes: `acknowledged` or `escalated`

### PlannedAction Construction Pattern

Containment workers that recommend irreversible actions return a `PlannedAction` alongside the result:

```java
PlannedAction action = PlannedAction.of(
    "Containment: " + decision.recommendedAction(),  // description
    actionType,                                       // e.g. "isolate.host"
    Map.of("riskScore", decision.riskScore(),
           "severity", severity,
           "tactic", primaryTactic));
return WorkerResult.of(output, action);
```

The `actionType` string must match `SocActionType.actionType()` format (lowercase, dot-separated) for `SocActionRiskClassifier` to recognise it. Unrecognised action types pass through as `Autonomous`.

---

## Case Context Key Vocabulary

Canonical context keys used by all SOC workers, bindings, and observers. These keys are the shared contract between components — workers write them, bindings guard on them, and observers read them.

### Alert and Detection (set at case creation)

| Key | Type | Set by | Description |
|---|---|---|---|
| `alert` | Map | `SocCaseInputContributor` | Alert data from the CloudEvent: eventType, severity, confidence, timestamp, source, rule |
| `priority` | String | baseCaseData in situation YAML | Case priority from the trigger (e.g. `HIGH`) |
| `source` | String | baseCaseData in situation YAML | Alert source category (e.g. `siem-alert`, `auth-brute-force`) |
| `situationId` | String | RAS runtime | Situation definition ID that triggered the case |
| `correlationKey` | String | RAS runtime | Entity the event concerns (e.g. host ID, source IP) |
| `detections` | List&lt;Map&gt; | `SocCaseInputContributor` | All detections from the situation: ganglionId, signal, confidence, eventTime, evidence |

### Investigation Pipeline (set by capability bindings)

| Key | Type | Set by | Description |
|---|---|---|---|
| `iocEnrichment` | Map | ioc-enrichment capability | IOCs extracted from alert: `iocs` (list), `summary` (string) |
| `attckMapping` | Map | attck-mapping capability | ATT&CK mapping: `techniques` (list), `primaryTactic`, `confidence`, `narrative` |
| `containmentRecommendation` | Map | containment-recommendation capability | Recommended action: `recommendedAction`, `riskScore`, `confidenceScore`, `rationale`, `actionParameters` |
| `retrievedIncidents` | List | cbr-retrieval capability | Similar past incidents from CBR (Layer 4b) |

### Incident Lifecycle (set by `SocIncidentStatusObserver`)

| Key | Type | Set by | Description |
|---|---|---|---|
| `incidentStatus` | String | Output projections + observer | Current lifecycle state: `TRIAGING`, `INVESTIGATING`, `CONTAINING`, `RESOLVED`, `ESCALATED`, `FALSE_POSITIVE` |

State transitions are forward-only (enforced by ordinal comparison in `SocIncidentStatusObserver`). `SocIncidentStatusChangedEvent` CDI event fires on each transition with caseId, tenancyId, previousStatus, newStatus, occurredAt.

### Analyst Decision (set by analyst-review humanTask outputMapping)

| Key | Type | Set by | Description |
|---|---|---|---|
| `analystDecision` | String | analyst-review outputMapping | Terminal decision: `resolved`, `escalated`, `false-positive`. Mapped from WorkItem outcome (CONFIRM_SEVERITY/DOWNGRADE → resolved, ESCALATE → escalated, FALSE_POSITIVE → false-positive, null → escalated). |

### Binding Guard Chain

The investigation pipeline is sequenced by `when` guards on each binding. Each guard checks that the prior stage's output exists and the current stage's output does not:

```
alert != null ──→ ioc-enrichment
iocEnrichment != null ──→ attck-mapping
attckMapping != null ──→ containment-recommendation
containmentRecommendation != null ──→ analyst-review
```

---

## Case Definition YAML Details

File: `app/src/main/resources/soc/incident-investigation.yaml`

**Structure:**
- DSL version 0.1, case version 1.0.0
- Namespace: `io.casehub.soc`
- 3 capability definitions with JQ input/output projections
- 4 bindings (3 capability + 1 humanTask), all on `contextChange` triggers with `when` guards
- 3 success goals, completion requires any one

**Capability input/output projections** (JQ expressions):
- `ioc-enrichment`: input `{ alert: .alert }`, output `{ iocEnrichment: . }`
- `attck-mapping`: input `{ alert: .alert, iocEnrichment: .iocEnrichment }`, output `{ attckMapping: . }`
- `containment-recommendation`: input `{ alert: .alert, iocEnrichment: .iocEnrichment, attckMapping: .attckMapping }`, output `{ containmentRecommendation: . }`

**Sequential enforcement:** Each binding's `when` guard checks that the previous stage's output exists and the current stage's output does not. This creates a sequential pipeline without explicit ordering.

---

## RAS Situation Configuration

File: `app/src/main/resources/META-INF/ras-situations.yaml`

**soc-siem-alert-critical:**
- Listens to all 6 CloudEvent types (`soc.alert.siem.*`, `soc.alert.edr.*`)
- Chain mode: `threshold` -- requires `siem-alert-classifier` Ganglion to report >= 0.8 confidence
- Correlation window: 15 minutes
- Event buffer delay: 30 seconds
- Trigger action: create `incident-investigation` case (namespace `io.casehub.soc`, version 1.0.0)
- Base case data: `priority: HIGH`, `source: siem-alert`

**soc-brute-force-by-source:** Count mode (5 events in 5min), correlates by source IP. Triggers `incident-investigation` case with `source: auth-brute-force`.

**soc-credential-stuffing-by-target:** Count mode (3 events in 1hr), correlates by target account. Triggers `incident-investigation` case with `source: auth-credential-stuffing`.

Both use `BruteForceDetectorGanglion` (handles 4 auth event types) with pluggable `BruteForceScorer` SPI (default confidence 0.9).

---

## Test Coverage

Tests cover all implemented layers:

### api/ tests
- `SiemAlertGanglionTest` -- severity classification, missing extensions, unknown severity
- `AttackTaxonomyTest` -- AttackTactic MITRE IDs, AttackTechnique validation, subtechnique parsing
- `IocTest` -- record validation, equality by (type, value), confidence bounds
- `SocActionTypeTest` -- action type string conversion, gate policy, round-trip fromActionType
- `SocAgentDescriptorsTest` -- descriptor factory: 6 descriptors, unique agent IDs, capability names match YAML, epistemic domains, disposition

### app/ tests
- `SocCaseHubTest` -- YAML loading, worker augmentation, agent descriptor wiring
- `SocAgentRegistrarTest` -- CDI discovery, descriptor count, agent ID format
- `SocInvestigationCaseDescriptorTest` -- worker count, capability names, null ChatModel handling
- `SocFaultedCaseReviewCreatorTest` -- outcome filtering, priority derivation, idempotency, title generation
- `AlertToCaseIntegrationTest` -- end-to-end: CloudEvent -> Ganglion -> SituationEvaluator -> CaseInstance
- `SocActionRiskClassifierTest` -- all gate policies, threshold logic, missing context fail-closed
- `IocExtractorTest` -- regex patterns for all IOC types, deduplication, nested map traversal
- `AttckLookupTableTest` -- rule matching, IOC type correlation, fallback default
- `ContainmentDecisionMatrixTest` -- severity x tactic matrix, edge cases
- `RuleIocEnrichmentWorkerTest`, `RuleAttckMappingWorkerTest`, `RuleContainmentRecWorkerTest` -- worker output format
- `LlmIocEnrichmentWorkerTest`, `LlmAttckMappingWorkerTest`, `LlmContainmentRecWorkerTest` -- noFunction() fallback, MockChatModel
- `CapabilityOutputContractTest` -- shared output record validation

---

## Depended On By

None currently -- casehub-soc is a leaf application.

---

## Delivery Roadmap

The project follows a **vertical slice** approach. Each slice delivers one incident scenario end-to-end, built in layers:

| Slice/Layer | Description | Status |
|---|---|---|
| Slice 0 | Domain vocabulary + platform integration | **Complete** |
| Slice 1, Layer 1 | Alert ingestion and case creation (RAS pipeline) | **Complete** |
| Slice 1, Layer 2 | Triage workers (rule-based + LLM, 6 workers) | **Complete** |
| Slice 1, Layer 3 | Analyst review, SLA enforcement, failure binding | **Complete** (#11, #12, #19) |
| Slice 1, Layer 4a | Trust scoring, agent routing, agent descriptors | **Complete** (#20, #22) |
| Slice 1, Layer 4b | CBR retain/retrieve, incident lifecycle | **Complete** (#23) |
| Slice 1, Layer 5 | Compliance audit trail, LedgerEntry subclasses | **Complete** (#24) |
| Slice 2 | Brute force + credential stuffing detection | **Complete** (#25) |
| Slice 3 | Real-time event correlation (Drools CEP -- engine#809) | Future |
| Slice 4 | Multi-tenant SOC-as-a-Service | Future |

---

## Open Issues

| # | Title | Notes |
|---|---|---|
| 16 | Rewrite ARC42STORIES for vertical slice approach | Docs task |
| 13 | Incident lifecycle state management | Covered by #23 — pending close |

---

## Design Documents

| Document | Path | Purpose |
|---|---|---|
| CLAUDE.md | `CLAUDE.md` | Project conventions and design philosophy |
| ARC42STORIES.MD | `ARC42STORIES.MD` | Full delivery plan: vertical slices with layers |
| DOMAIN.md | `docs/DOMAIN.md` | SOC domain background: 3-tier model, MITRE ATT&CK, NIST incident lifecycle, compliance frameworks, competitive landscape |
| NEXT-STEPS.md | `docs/NEXT-STEPS.md` | Immediate implementation priorities |
| PLATFORM-INVENTORY.md | `docs/PLATFORM-INVENTORY.md` | Platform capability inventory for SOC use cases |
| ADR-001 | `docs/adr/ADR-001-ras-cases-over-custom-entities.md` | RAS + Cases over custom alert/incident entities |
| Slice 1 Design | `docs/specs/slice-1-siem-critical-alert/2026-07-29-slice-1-design.md` | Slice 1 detailed design spec |

---

## Platform Gaps (Filed or Known)

| Gap | Issue | Impact | Workaround |
|---|---|---|---|
| `Agent.plannedActionExtractor` | engine#829 | Uniform AgentWorkerFunction for containment LLM worker | Use `WorkerFunction.Sync` with manual PlannedAction extraction |
| Worker reroute on failure | -- | Exclusion list writer missing | Failure-review WorkItem via CaseOutcomeObserver |
| Drools CEP | engine#809 | Blocks Slice 3 real-time event correlation | None |
| Multi-approver OversightGate | engine#810 | Layer 3 multi-approver containment | Single-approver workaround |
| Durable EventStore | pages#256 | Production deployment | In-memory for dev |
| `langchain4j-anthropic` runtime | -- | LLM workers non-functional | Workers register with `noFunction()` |
