# Slice 1: SIEM Critical Alert — Design Spec

**Date:** 2026-07-29
**Status:** Draft
**ARC42STORIES ref:** Slice 1, Layers 1–5
**Branch:** TBD (will be created at work-start)

---

## Overview

This spec deep-dives into the design for the SIEM critical alert vertical slice. It covers data flows, interface contracts, component composition, error handling, and edge cases that ARC42STORIES.MD defines at the architectural level.

The slice delivers one incident scenario end-to-end across 6 layers (Layer 4 split into 4a/4b), with both rule-based and LLM workers, a growing application shell, CBR integration, and compliance evidence.

**Design review corrections applied (2026-07-29):** Worker CDI wiring pattern, LedgerEntry base class, CDI event types, CBR store signatures, PreferenceKey API, AgentProvider blocking adapter, binding failure handling, case YAML field names — all verified against platform source code.

---

## Layer 1 — Alert Ingestion & Case Creation

### Data Flow

```
CloudEvent (soc.alert.siem.crowdstrike)
    │
    ▼
SiemAlertGanglion.evaluate(event, context)
    │  reads: event.getExtension("alertseverity")
    │  returns: DetectionResult (DETECTED/0.95 for CRITICAL)
    ▼
RAS SituationEvaluator
    │  evaluates threshold chain: siem-alert-classifier ≥ 0.8 confidence
    │  correlation window: PT15M
    │  buffer delay: PT30S
    ▼
SituationStore.save(situation)  ← InMemorySituationStore + JpaSituationStore exist
    │
    ▼
TriggerAction.CreateCase matched → CaseTrigger.fire(config, context)
    │  CaseTriggerConfig from situation YAML triggerConfig:
    │    caseNamespace: io.casehub.soc
    │    caseName: incident-investigation
    │    caseVersion: 1.0
    │    baseCaseData: { priority: HIGH, source: siem-alert }
    │  DefaultCaseTrigger finds matching CaseHub → hub.startCase(inputData)
    ▼
CaseInstance created
    │  case context seeded with alert data
    │  bindings evaluate: ioc-enrichment fires first
    ▼
Application shell receives SSE push → incident list updates
```

### SituationStore Status

`SituationStore` interface exists in `casehub-ras-api` with 9 methods (find, save, remove, removeExpired, tryClaimTrigger, findActive, etc.). Implementations exist:
- `InMemorySituationStore` in `ras/persistence-memory/` (`@Alternative @Priority(100)`)
- `JpaSituationStore` in `ras/persistence-jpa/`

parent#398 may be stale — verify before treating Layer 1 as blocked. Layer 1 can use `InMemorySituationStore` for development and tests regardless.

### Case Context Seed

When the case is created, the initial context contains:

```json
{
  "alert": {
    "eventType": "soc.alert.siem.crowdstrike",
    "severity": "CRITICAL",
    "source": "crowdstrike",
    "rule": "credential-harvesting-detected",
    "timestamp": "2026-07-29T14:30:00Z",
    "rawData": { }
  },
  "priority": "HIGH",
  "source": "siem-alert"
}
```

This seed is what the bindings' `when` guards evaluate against. The first binding (`ioc-enrichment`) fires because `.alert != null and .iocEnrichment == null`.

### Application Shell — Layer 1

Quarkus serves the application shell via a JAX-RS resource that renders the pages runtime. The shell at Layer 1 is minimal:

```
┌──────────────────────────────────────────────┐
│  SOC — Incident Response                     │
├──────────────────────────────────────────────┤
│                                              │
│  <blocks-case-explorer>                      │
│    ┌────────┬──────────┬────────┬──────────┐ │
│    │ ID     │ Priority │ Source │ Status   │ │
│    ├────────┼──────────┼────────┼──────────┤ │
│    │ INC-01 │ HIGH     │ SIEM   │ TRIAGING │ │
│    │ INC-02 │ MEDIUM   │ AUTH   │ DETECTED │ │
│    └────────┴──────────┴────────┴──────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

**Data source:** REST endpoint `GET /api/soc/incidents` returns incident list as TypedDataSet JSON. SSE via `EventBroadcaster` pushes updates when incidents are created or status changes.

**Push integration:**

```java
@ApplicationScoped
public class SocIncidentPushService {

    @Inject EventBroadcaster broadcaster;

    public void onIncidentCreated(@ObservesAsync CaseLifecycleEvent event) {
        if (!"CaseStarted".equals(event.eventType())) return;
        JsonNode ctx = event.contextSnapshot();
        broadcaster.broadcast("soc.incidents",
            Map.of("op", "append",
                   "id", event.caseId(),
                   "priority", ctx.path("priority").asText(),
                   "source", ctx.path("source").asText(),
                   "status", "DETECTED"));
    }
}
```

### Error Handling — Layer 1

| Scenario | Behaviour |
|----------|-----------|
| CloudEvent with unknown `ce-type` | Ganglion ignores (not in `EVENT_TYPES`) — no detection |
| Missing `alertseverity` extension | Ganglion returns INFORMATIONAL → NOISE signal → situation threshold not met |
| SituationStore write fails | RAS should retry (platform concern) — SOC has no workaround |
| CaseTrigger.fire() fails | Case not created — alert lost. Mitigation: dead-letter queue (platform concern) |
| Duplicate CloudEvents within correlation window | RAS buffer delay (PT30S) deduplicates — same situation, not multiple cases |

---

## Layer 2 — Triage Workers (Rule-Based + LLM)

### Worker Contract

All three capabilities follow the same pattern. Each has a rule-based and an LLM worker registered as separate named `Worker` beans with separate case YAML bindings. `ImplementationRoutingStrategy` selects which binding(s) to fire.

Workers follow the established `FlowWorkerFunction` pattern with `Map<String, Object>` I/O (matching AML convention). The case YAML bindings define `inputProjection` and `outputProjection` as JQ expressions that extract from / write to case context.

**CDI wiring (NOT @DefaultBean/@Alternative):** Both workers are independent named beans. CDI displacement (`@DefaultBean`/`@Alternative`) is all-or-nothing — it picks ONE winner, not two candidates for routing. For dual-agent routing, we need two bindings per capability in the case YAML, each referencing a different worker name.

**LLM workers** wrap `AgentProvider.invoke()` (returns `Multi<AgentEvent>`) with a blocking adapter that collects the stream to a completed result. This is the one exception to the "blocking APIs only" rule — the adapter encapsulates the reactive boundary.

### IOC Enrichment

**Input type:**

```java
public record IocEnrichmentInput(AlertData alert) {}

public record AlertData(
    String eventType,
    String severity,
    String source,
    String rule,
    Map<String, Object> rawData) {}
```

**Output type:**

```java
public record IocEnrichmentOutput(List<Ioc> iocs, String summary) {}
```

**Rule-based worker (named bean):**

```java
@ApplicationScoped
@Named("rule-ioc-enrichment")
public class RuleBasedIocEnrichmentWorker {

    @Produces @ApplicationScoped
    Worker ruleIocEnrichmentWorker() {
        return Worker.builder()
            .name("rule-ioc-enrichment")
            .capabilityName("ioc-enrichment")
            .function((Map<String, Object> input, WorkerScope scope) -> {
                // Pattern-matches known IOC formats in alert rawData:
                // IPv4/IPv6 → IP_ADDRESS, MD5/SHA1/SHA256 → FILE_HASH_*,
                // domains, URLs, emails, CVEs
                Map<String, Object> output = extractIocs(input);
                return WorkerResult.of(output);
            })
            .build();
    }
}
```

**LLM worker (separate named bean):**

```java
@ApplicationScoped
@Named("llm-ioc-enrichment")
public class LlmIocEnrichmentWorker {

    @Inject AgentProvider agentProvider;

    @Produces @ApplicationScoped
    Worker llmIocEnrichmentWorker() {
        return Worker.builder()
            .name("llm-ioc-enrichment")
            .capabilityName("ioc-enrichment")
            .function((Map<String, Object> input, WorkerScope scope) -> {
                // Blocking adapter over AgentProvider.invoke() (Multi<AgentEvent>):
                AgentSessionConfig config = buildPrompt(input);
                String result = agentProvider.invoke(config)
                    .collect().asList()
                    .await().atMost(Duration.ofMinutes(2))
                    .stream()
                    .filter(e -> e instanceof AgentEvent.TextDelta)
                    .map(e -> ((AgentEvent.TextDelta) e).text())
                    .collect(Collectors.joining());
                return WorkerResult.of(parseOutput(result));
            })
            .build();
    }
}
```

### ATT&CK Mapping

**Input type:**

```java
public record AttckMappingInput(AlertData alert, IocEnrichmentOutput iocEnrichment) {}
```

**Output type:**

```java
public record AttckMappingOutput(
    List<TechniqueMapping> techniques,
    AttackTactic primaryTactic,
    double confidence,
    String narrative) {}

public record TechniqueMapping(
    AttackTechnique technique,
    double confidence,
    String evidence) {}
```

**Rule-based:** Lookup table mapping alert categories + IOC types → ATT&CK techniques. E.g. `alertRule=credential-harvesting + IocType.EMAIL → T1566 (Phishing), tactic=INITIAL_ACCESS`.

**LLM:** Claude agent reasons about the full investigation context, maps to ATT&CK with natural language narrative explaining the attack chain.

### Containment Recommendation

**Input type:**

```java
public record ContainmentInput(
    AlertData alert,
    IocEnrichmentOutput iocEnrichment,
    AttckMappingOutput attckMapping) {}
```

**Output type:**

```java
public record ContainmentOutput(
    SocActionType recommendedAction,
    double riskScore,
    double confidenceScore,
    String rationale,
    Map<String, Object> actionParameters) {}
```

**Rule-based:** Severity + ATT&CK tactic → recommended SocActionType. CRITICAL + CREDENTIAL_ACCESS → REVOKE_CREDENTIALS. HIGH + LATERAL_MOVEMENT → ISOLATE_HOST.

**LLM:** Claude agent considers full investigation context, recommends containment with reasoned rationale. Returns `PlannedAction` that goes through `SocActionRiskClassifier`.

If the worker returns a `WorkerResult` with a `PlannedAction`, the engine invokes `SocActionRiskClassifier.classify()`. If the result is `GateRequired`, the case pauses and an approval WorkItem is created (Layer 3).

### Implementation Routing

`ImplementationRoutingStrategy` selects between bindings. The case YAML has two bindings per capability:

```yaml
- name: rule-ioc-enrichment
  on: { contextChange: {} }
  when: ".alert != null and .iocEnrichment == null"
  capability: ioc-enrichment
  worker: rule-ioc-enrichment

- name: llm-ioc-enrichment
  on: { contextChange: {} }
  when: ".alert != null and .iocEnrichment == null"
  capability: ioc-enrichment
  worker: llm-ioc-enrichment
```

`TrustWeightedImplementationRoutingStrategy` uses a five-phase maturity model:

| Phase | Behaviour |
|-------|-----------|
| Bootstrap | `RunAll()` — both workers fire (insufficient history) |
| Qualified | `Selected(bindingNames)` — trust-scored selection, workload blend |
| Borderline | Score within margin of threshold — conservative selection |
| Excluded-2B | Score below threshold — filtered out |
| Excluded-3 | Passed threshold but failed quality floor — filtered out |

**Note:** During Bootstrap, `RunAll()` fires BOTH workers. The first to complete writes to case context; the second sees the `when` guard is already false and effectively no-ops. This is safe because the `when` guard checks `.iocEnrichment == null` — once one worker writes it, the other binding's guard fails.

The `ImplementationRoutingContext` includes `experiences: List<RetrievedExperience>` from CBR (Layer 4) — past incident data informs which implementation to trust.

### Agent Descriptors

Registered at startup via CDI producer:

```java
@ApplicationScoped
public class SocAgentRegistrar {

    @Inject AgentRegistry registry;

    void onStartup(@Observes StartupEvent event) {
        registry.register(AgentDescriptor.builder()
            .agentId("rule:ioc-enrichment")
            .name("Rule-Based IOC Enrichment")
            .slot("ioc-analyst")
            .capabilities(List.of(
                AgentCapability.builder()
                    .name("ioc-enrichment")
                    .tags(List.of("soc:initial-access:enrichment"))
                    .build()))
            .tenancyId("casehubio")
            .build());

        registry.register(AgentDescriptor.builder()
            .agentId("claude:ioc-enrichment@v1")
            .name("LLM IOC Enrichment")
            .slot("ioc-analyst")
            .provider("anthropic")
            .modelFamily("claude")
            .capabilities(List.of(
                AgentCapability.builder()
                    .name("ioc-enrichment")
                    .tags(List.of("soc:initial-access:enrichment"))
                    .build()))
            .tenancyId("casehubio")
            .build());

        // ... repeat for attck-mapping, containment-recommendation
    }
}
```

### Application Shell — Layer 2 Addition

Adds investigation detail view with channel activity:

```
┌──────────────────────────────────────────────────────────────┐
│  SOC — Incident Response                                     │
├────────────────────┬─────────────────────────────────────────┤
│                    │                                         │
│ <case-explorer>    │  <channel-activity>                     │
│  INC-01 ◀ selected │    /work: COMMAND → ioc-enrichment      │
│  INC-02            │    /work: DONE (3 IOCs found)           │
│  INC-03            │    /observe: EVENT (ATT&CK: T1566)      │
│                    │    /work: COMMAND → containment-rec      │
│                    │                                         │
└────────────────────┴─────────────────────────────────────────┘
```

**Data source:** SSE topic `soc.channels.{caseId}` pushes channel messages. `DataSourceMixin` on `<blocks-channel-activity>` binds to the endpoint.

### Error Handling — Layer 2

| Scenario | Behaviour |
|----------|-----------|
| Rule-based worker throws exception | `WorkerResult.failed(reason)` — engine records failure, may retry via `DefaultOutcomePolicy` |
| LLM worker timeout (Claude API slow) | `WorkerResult.expired(reason)` — engine routes to fallback (rule-based) |
| LLM worker returns unparseable output | Catch, log, return `WorkerResult.failed("output parse error")` — fallback to rule-based |
| Both workers fail | Engine records FAILURE on commitment — trust score decremented — case context shows investigation failed — analyst review WorkItem still fires (binding guard checks `.containmentRecommendation != null`, but analyst-review should also fire on error paths) |
| No IOCs found in alert | Valid outcome — `IocEnrichmentOutput(emptyList(), "No IOCs identified")` — ATT&CK mapping still fires with empty IOC context |

**Critical edge case:** The case YAML binding chain is sequential (`when` guards check prior stage output). If ioc-enrichment fails, `.iocEnrichment` is never set → attck-mapping never fires → containment-recommendation never fires → analyst-review never fires. **The case would stall.**

**Mitigation:** Add a fallback binding that fires on worker failure:

```yaml
- name: investigation-failed
  on: { contextChange: {} }
  when: ".investigationFailed != null and .analystDecision == null"
  humanTask:
    title: "Investigation failed — manual review required"
    candidateGroups:
      - soc-tier2-analyst
    expiresIn: PT4H
```

**Implementation note:** A worker returning `WorkerResult.failed()` has null output by default — the engine may not write null to case context. Workers must return `WorkerResult.failed(reason, partialOutput)` where partialOutput includes an error marker. Alternatively, investigate whether the engine supports a failure-trigger binding (`on: { failure: {} }`) — this would be cleaner than context-marker-based fallback. Verify against engine binding handler code during Layer 2 implementation.

---

## Layer 3 — Analyst Review & SLA

### WorkItem Template

The analyst-review binding in the case YAML creates a WorkItem via `HumanTaskTarget`. The WorkItem carries:

```java
// WorkItem properties (from case context projection)
Map.of(
    "incidentId", caseId,
    "priority", context.get("priority"),
    "alert", context.get("alert"),
    "iocEnrichment", context.get("iocEnrichment"),
    "attckMapping", context.get("attckMapping"),
    "containmentRecommendation", context.get("containmentRecommendation"),
    "retrievedIncidents", context.get("retrievedIncidents")  // from CBR, Layer 4
)
```

**Outcomes:** `CONFIRM_SEVERITY`, `DOWNGRADE`, `ESCALATE`, `FALSE_POSITIVE`

Each outcome maps to a case context update:

| Outcome | Case Context Update | Effect |
|---------|--------------------|----|
| CONFIRM_SEVERITY | `analystDecision = "resolved"` | Case goal `resolved` met → case completes |
| DOWNGRADE | `analystDecision = "resolved"`, `severityOverride = <lower>` | Case completes, trust feedback: severity was wrong |
| ESCALATE | `analystDecision = "escalated"` | Case goal `escalated` met → case completes, new case opened at higher priority |
| FALSE_POSITIVE | `analystDecision = "false-positive"` | Case goal `false-positive` met → case completes, trust feedback: false alarm |

### SLA Breach Policy

```java
@ApplicationScoped
public class SocSlaBreachPolicy implements SlaBreachPolicy {

    @Override
    public String id() { return "soc-escalation"; }

    @Override
    public BreachDecision onBreach(SlaBreachContext context) {
        String priority = resolvePriority(context);
        return switch (priority) {
            case "P1" -> switch (context.breachType()) {
                case CLAIM_EXPIRED -> BreachDecision.EscalateTo
                    .to(SocGroups.SOC_MANAGER)
                    .withDeadline(Duration.ofMinutes(30));
                case COMPLETION_EXPIRED -> BreachDecision.EscalateTo
                    .to(SocGroups.SOC_MANAGER)
                    .withDeadline(Duration.ofMinutes(30))
                    .thenOnBreach(new BreachDecision.Fail(
                        "P1 SLA exceeded — incident unresolved"));
            };
            case "P2" -> switch (context.breachType()) {
                case CLAIM_EXPIRED -> BreachDecision.EscalateTo
                    .to(SocGroups.TIER3_ANALYST)
                    .withDeadline(Duration.ofHours(2));
                case COMPLETION_EXPIRED -> BreachDecision.EscalateTo
                    .to(SocGroups.SOC_MANAGER)
                    .withDeadline(Duration.ofHours(2))
                    .thenOnBreach(new BreachDecision.Fail(
                        "P2 SLA exceeded — incident unresolved"));
            };
            case "P3" -> new BreachDecision.Extend(Duration.ofHours(12))
                .thenOnBreach(BreachDecision.EscalateTo
                    .to(SocGroups.SOC_MANAGER)
                    .withDeadline(Duration.ofHours(24)));
            default -> new BreachDecision.Extend(Duration.ofHours(24))
                .thenOnBreach(new BreachDecision.Fail(
                    "SLA exceeded — incident unresolved"));
        };
    }

    private String resolvePriority(SlaBreachContext context) {
        // Read from preferences using scope path
        // Fallback: extract from WorkItem properties
    }
}
```

### Containment Approval Flow

When a worker's `ContainmentOutput` includes a `PlannedAction`:

1. Engine calls `SocActionRiskClassifier.classify(plannedAction, classificationContext)`
2. If `GateRequired` → `OversightGateService.openGate()` creates a WorkItem
3. WorkItem goes to `candidateGroups` from `SocActionType` (e.g. `SOC_MANAGER` for `ISOLATE_HOST`)
4. Outcomes: `APPROVE`, `REJECT`, `MODIFY_AND_APPROVE`
5. On APPROVE → `ActionGateApprovedHandler` resumes the case, containment binding fires
6. On REJECT → case context updated with `actionGateRejected = true`, alternative path activated

**M-of-N future (engine#810):** When the multi-approver `OversightGateService` lands, high-risk actions (`WIPE_ENDPOINT`, `NETWORK_SEGMENTATION`) will spawn M-of-N WorkItem groups. The `<blocks-approval-gate>` QuorumConfig UI is already ready. Until then, single-approver semantics apply.

### Application Shell — Layer 3 Addition

```
┌──────────────────────────────────────────────────────────────────────┐
│  SOC — Incident Response                                             │
├────────────────────┬─────────────────────────────────────────────────┤
│                    │                                                 │
│ <work-item-        │  Incident INC-01 — Credential Harvesting        │
│  workbench>        │  ┌─────────────────────────────────────────┐    │
│                    │  │ <sla-indicator> P1: 12:30 remaining     │    │
│  ■ INC-01 P1 ◀    │  ├─────────────────────────────────────────┤    │
│  □ INC-02 P2      │  │ IOCs: 3 found (2 IPs, 1 hash)          │    │
│  □ INC-03 P3      │  │ ATT&CK: T1566 (Phishing) — HIGH conf   │    │
│                    │  │ Containment: REVOKE_CREDENTIALS          │    │
│ <notification-     │  ├─────────────────────────────────────────┤    │
│  inbox>            │  │ <approval-gate>                          │    │
│  🔔 2 new          │  │  Approve containment: REVOKE_CREDENTIALS │    │
│                    │  │  [Approve] [Reject] [Modify & Approve]   │    │
│                    │  └─────────────────────────────────────────┘    │
│                    │                                                 │
│                    │  <channel-activity> (from Layer 2)               │
│                    │                                                 │
└────────────────────┴─────────────────────────────────────────────────┘
```

### Error Handling — Layer 3

| Scenario | Behaviour |
|----------|-----------|
| WorkItem claim SLA expires | `SocSlaBreachPolicy.onBreach(CLAIM_EXPIRED)` → escalate per priority |
| WorkItem completion SLA expires | `SocSlaBreachPolicy.onBreach(COMPLETION_EXPIRED)` → escalate, then fail |
| Analyst rejects containment | Case context: `actionGateRejected = true` → alternative path or manual investigation |
| Analyst selects ESCALATE | New case opened at higher priority, current case marked as escalated |
| Multiple analysts try to claim same WorkItem | Work module handles via ASSIGNED status — second claim rejected |

---

## Layer 4 — Trust, CBR & Incident Lifecycle

### Trust Dimensions

Defined as constants in `api/`:

```java
public final class SocTrustDimensions {
    public static final String TRIAGE_ACCURACY = "triage-accuracy";
    public static final String INVESTIGATION_THOROUGHNESS = "investigation-thoroughness";
    public static final String CONTAINMENT_EFFECTIVENESS = "containment-effectiveness";
    public static final String FALSE_POSITIVE_RATE = "false-positive-rate";
}
```

### Attestation Flow

At case resolution:

1. Case completes with goal (resolved/escalated/false-positive)
2. CDI observer fires `@ObservesAsync CaseLifecycleEvent` (filter on `satisfiedGoalName`)
3. `SocAttestationService` creates `LedgerAttestation`:

```java
LedgerAttestation attestation = new LedgerAttestation();
attestation.id = UUID.randomUUID();
attestation.ledgerEntryId = resolutionLedgerEntryId;
attestation.subjectId = caseId;
attestation.attestorId = analystId;
attestation.attestorType = ActorType.HUMAN;
attestation.verdict = analystDecision.equals("false-positive")
    ? AttestationVerdict.FLAGGED
    : AttestationVerdict.SOUND;
attestation.confidence = 1.0;
attestation.capabilityTag = primaryCapabilityUsed;
attestation.trustDimension = SocTrustDimensions.TRIAGE_ACCURACY;
attestation.occurredAt = Instant.now();
```

4. Trust score updated via incremental Bayesian Beta: SOUND → α+1, FLAGGED → β+1

### CBR Integration

**CbrCaseTypeRegistration:**

```java
@ApplicationScoped
public class SocCbrCaseTypeRegistration implements CbrCaseTypeRegistration {

    @Override
    public String cbrType() { return "soc-incident"; }

    @Override
    public Class<?> caseClass() { return SocIncidentCbrCase.class; }
}
```

**Case representation:**

```java
public record SocIncidentCbrCase(
    String alertType,
    String sourceSystem,
    List<String> attckTechniqueIds,
    List<String> iocTypes,
    String severityOutcome,
    boolean containmentSuccess,
    boolean falsePositive,
    String playbook,
    long investigationDurationMinutes
) implements CbrCase {

    @Override
    public String cbrType() { return "soc-incident"; }
}
```

**Retain (on case resolution):**

```java
@ApplicationScoped
public class SocCbrRetainService {

    @Inject CbrCaseMemoryStore cbrStore;

    void onCaseCompleted(@ObservesAsync CaseLifecycleEvent event) {
        if (event.satisfiedGoalName() == null) return;
        SocIncidentCbrCase cbrCase = buildFromContext(event.contextSnapshot());

        cbrStore.store(
            cbrCase,                                    // CbrCase
            "soc-incident",                             // caseType (CBR discriminator)
            event.caseId().toString(),                  // entityId
            new MemoryDomain("soc-incidents"),          // domain
            event.tenancyId(),                          // tenantId
            buildTextDescription(event.contextSnapshot()), // caseId
            io.casehub.platform.api.path.Path.of("soc", "incidents")); // scope
    }
}
```

**Retrieve (on case creation — enriches Layer 1 pipeline):**

```java
@ApplicationScoped
public class SocCbrRetrieveService {

    @Inject CbrCaseMemoryStore cbrStore;

    public List<ScoredCbrCase<SocIncidentCbrCase>> findSimilar(
            Map<String, Object> alertContext, String tenantId) {

        CbrQuery query = CbrQuery.of(
            tenantId,
            new MemoryDomain("soc-incidents"),
            io.casehub.platform.api.path.Path.of("soc", "incidents"),
            "soc-incident",                             // caseType
            extractFeatures(alertContext),
            5);                                         // topK

        return cbrStore.retrieveSimilar(query, SocIncidentCbrCase.class);
    }
}
```

Retrieved incidents are injected into case context as `retrievedIncidents` so that:
- Triage workers (Layer 2) use them as context
- LLM workers include them in prompt ("Based on 5 similar past incidents...")
- Analyst review (Layer 3) shows them via `<blocks-similarity-panel>`
- `ImplementationRoutingContext.experiences()` feeds them to the routing strategy

### Incident Lifecycle State

Tracked via case context field `incidentStatus`:

```
DETECTED → TRIAGING → INVESTIGATING → CONTAINING → RESOLVED
                                                  → ESCALATED
                                                  → FALSE_POSITIVE
```

State transitions driven by binding execution:
- Case created → `DETECTED`
- First worker fires → `TRIAGING`
- IOC enrichment complete → `INVESTIGATING`
- Containment recommendation complete → `CONTAINING`
- Analyst decision → terminal state

CDI events fired on transition for downstream consumers (push, ledger, CBR).

### Application Shell — Layer 4 Addition

Adds trust panel, timeline, CBR panel, and KPIs to the detail view:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SOC — Incident Response                                                 │
├────────┬───────────────────────────────────────────────┬─────────────────┤
│        │                                               │                 │
│ inbox  │  Incident INC-01                              │ <trust-score-   │
│        │  <blocks-timeline>                            │  panel>         │
│        │    14:30 Alert received (CRITICAL)            │  triage: 0.82   │
│        │    14:31 IOC enrichment (3 IOCs)              │  invest: 0.75   │
│        │    14:32 ATT&CK: T1566 Phishing               │  contain: —     │
│        │    14:33 Containment: REVOKE_CREDENTIALS      │                 │
│        │    14:35 Analyst review (pending)              │ <similarity-    │
│        │                                               │  panel>         │
│        │  <routing-rationale>                          │  3 similar      │
│        │    Selected: claude:ioc-enrichment@v1         │  incidents      │
│        │    Reason: trust 0.82 > rule 0.65             │  (80% P2)       │
│        │                                               │                 │
│        ├───────────────────────────────────────────────┤                 │
│        │  <kpi-metric-row>                             │                 │
│        │    Open: 3 │ MTTR: 24m │ FP Rate: 12%        │                 │
│        │                                               │                 │
└────────┴───────────────────────────────────────────────┴─────────────────┘
```

---

## Layer 5 — Compliance & Audit

### LedgerEntry Subclasses

Each is a JPA `@Entity` extending `JpaLedgerEntry` (not `LedgerEntry` which is a `@MappedSuperclass`). Uses JOINED inheritance — each subclass gets its own table. Must override `domainContentBytes()` for Merkle hash inclusion.

```java
@Entity
@Table(name = "soc_alert_triage_ledger_entry")
@DiscriminatorValue("SOC_ALERT_TRIAGE")
public class AlertTriageLedgerEntry extends JpaLedgerEntry {
    @Column(name = "alert_severity") String alertSeverity;
    @Column(name = "assigned_severity") String assignedSeverity;
    @Column(name = "triage_agent_id") String triageAgentId;
    @Column(name = "confidence_score") double confidenceScore;

    @Override
    protected byte[] domainContentBytes() {
        return (alertSeverity + assignedSeverity + triageAgentId + confidenceScore)
            .getBytes(StandardCharsets.UTF_8);
    }
}

@Entity
@Table(name = "soc_incident_promoted_ledger_entry")
@DiscriminatorValue("SOC_INCIDENT_PROMOTED")
public class IncidentPromotedLedgerEntry extends JpaLedgerEntry {
    @Column(name = "promotion_reason") String promotionReason;
    // causedByEntryId → AlertTriageLedgerEntry

    @Override
    protected byte[] domainContentBytes() {
        return promotionReason.getBytes(StandardCharsets.UTF_8);
    }
}

// ... same pattern for InvestigationStep, ContainmentDecision,
//     ContainmentExecuted, IncidentResolved — each with @Table, @DiscriminatorValue,
//     and domainContentBytes() override
```

**Flyway migration:** `V1011__soc_ledger_entries.sql` — creates separate join tables per subclass (JOINED inheritance, not columns on base table).

### Merkle Proof Endpoint

```java
@Path("/api/soc/compliance")
@ApplicationScoped
public class SocComplianceResource {

    @Inject LedgerVerificationService verificationService;

    @GET
    @Path("/proof/{entryId}")
    public InclusionProof getProof(
            @PathParam("entryId") UUID entryId,
            @Context SecurityContext sec) {
        String tenancyId = currentPrincipal.tenancyId();
        return verificationService.inclusionProof(entryId, tenancyId);
    }

    @GET
    @Path("/timeline/{incidentId}")
    public List<LedgerEntry> getTimeline(
            @PathParam("incidentId") UUID incidentId,
            @Context SecurityContext sec) {
        String tenancyId = currentPrincipal.tenancyId();
        return ledgerRepository.findBySubjectId(incidentId, tenancyId);
    }
}
```

### Compliance Evidence

**Note:** The `EvidenceCollector` SPI referenced in ARC42STORIES does not exist in casehub-ops. The compliance module provides compliance framework definitions, but the evidence collection mechanism needs design. Options:

1. **SOC builds its own evidence queries** — query ledger entries by type and time window, aggregate into compliance reports. No platform SPI needed.
2. **Propose `EvidenceCollector` SPI** to casehub-ops — reusable across apps. File parent issue.

**Recommendation:** Option 1 for Slice 1 (SOC-specific queries), option 2 as a follow-on platform contribution.

**DORA response time report:**

```java
public record DoraResponseTimeReport(
    Instant reportPeriodStart,
    Instant reportPeriodEnd,
    int totalIncidents,
    Map<String, PriorityStats> byPriority) {}

public record PriorityStats(
    int count,
    Duration avgTimeToTriage,
    Duration avgTimeToContainment,
    Duration avgTimeToResolution,
    double slaCompliancePercent) {}
```

Built from ledger entry timestamps — `AlertTriageLedgerEntry.occurredAt` to `IncidentResolvedLedgerEntry.occurredAt` gives end-to-end timeline.

### GDPR

**DecisionContextSanitiser:**

```java
@ApplicationScoped
public class SocDecisionContextSanitiser implements DecisionContextSanitiser {

    // Strips from decision context JSON:
    // - IPv4/IPv6 addresses (regex replace with [REDACTED-IP])
    // - Email addresses (regex replace with [REDACTED-EMAIL])
    // - Person names (NER or pattern match, replace with [REDACTED-NAME])
    // - Hostnames containing PII (e.g. john-smiths-laptop)
    //
    // Preserves: ATT&CK IDs, severity, action types, timestamps, agent IDs
}
```

### Application Shell — Layer 5 Addition

Adds audit and compliance views:

```
┌─────────────────────────────────────────────────────────────────┐
│  SOC — Compliance                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  <audit-trail-viewer>                                           │
│    AlertTriage → IncidentPromoted → Investigation(IOC) →        │
│    Investigation(ATT&CK) → ContainmentDecision(APPROVED) →     │
│    ContainmentExecuted(SUCCESS) → IncidentResolved              │
│    [Verify Merkle Proof]                                        │
│                                                                 │
│  <compliance-summary>                                           │
│    DORA: 94% SLA compliance (P1: 100%, P2: 88%, P3: 95%)       │
│    SOC2: All containment actions have approval records ✓         │
│    Evidence entries: 1,247 this quarter                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Cutting Concerns

### Testing Strategy

Each layer has three test levels:

1. **Unit tests** — worker logic, risk classification, SLA policy, CBR mapping. No CDI container.
2. **Quarkus integration tests** (`@QuarkusTest`) — CDI wiring, case lifecycle, WorkItem creation. Uses `InMemory*` backends.
3. **End-to-end tests** — full flow from CloudEvent to case resolution. Requires SituationStore (parent#398).

**Test data:** Fixture CloudEvents for each SIEM source (CrowdStrike, Splunk, Sentinel). Fixture alert payloads with known IOC patterns for deterministic rule-based worker testing.

### Observability

- **Structured logging:** Each worker logs input/output with case ID correlation
- **Metrics:** Micrometer counters for incidents created, workers invoked, SLA breaches, trust updates
- **Tracing:** OpenTelemetry spans for the investigation pipeline (alert → triage → investigation → containment → resolution)

### Security

- **RBAC:** JAX-RS endpoints secured via `@RolesAllowed`. Incident data scoped to tenant via `CurrentPrincipal.tenancyId()`
- **LLM prompt injection:** LLM workers must not include raw alert payload in prompts without sanitisation. Alert data goes through a sanitiser that strips executable content.
- **Audit tamper resistance:** All decisions are `LedgerEntry` instances in the Merkle chain. No SOC code writes directly to the ledger tables — only through `LedgerEntryRepository`.

### Configuration

All tuneable parameters as `PreferenceKey<T>` in `api/`:

```java
public final class SocPreferences {
    public static final PreferenceKey<IntPreference> AUTO_TRIAGE_THRESHOLD =
        new PreferenceKey<>("soc", "autoTriageThreshold", IntPreference.of(70), IntPreference::parse);
    public static final PreferenceKey<BooleanPreference> AUTO_CONTAIN_LOW_RISK =
        new PreferenceKey<>("soc", "autoContainLowRisk", BooleanPreference.of(false), BooleanPreference::parse);
    public static final PreferenceKey<DurationPreference> P1_RESPONSE_WINDOW =
        new PreferenceKey<>("soc", "p1ResponseWindow", DurationPreference.of(Duration.ofMinutes(15)), DurationPreference::parse);
    public static final PreferenceKey<DoublePreference> CBR_SIMILARITY_THRESHOLD =
        new PreferenceKey<>("soc", "cbrSimilarityThreshold", DoublePreference.of(0.7), DoublePreference::parse);
    public static final PreferenceKey<IntPreference> CBR_MAX_RETRIEVED =
        new PreferenceKey<>("soc", "cbrMaxRetrieved", IntPreference.of(5), IntPreference::parse);
}
```

### Deployment Model

Single Quarkus process embedding engine + work + qhorus + ledger + ras + eidos + neocortex. Not a microservices decomposition.

- **Dev:** H2 in-memory database, `InMemorySituationStore`, `NoOpAgentProvider` (LLM workers disabled), pages static assets served from classpath
- **Prod:** PostgreSQL via Quarkus `%prod` profile, `JpaSituationStore`, `AgentProvider` with Claude API key, pages static assets via `casehub-pages-ui-static` Maven artifact

### Testing Strategy

| Level | What | How |
|-------|------|-----|
| Unit | Worker logic, risk classification, SLA policy, CBR mapping | Plain JUnit, no CDI container |
| Integration | CDI wiring, case lifecycle, WorkItem creation, binding chain | `@QuarkusTest` with `InMemory*` backends (`engine-testing`, `worker-testing`, `qhorus-testing`, `platform-testing` test artifacts) |
| End-to-end | Full CloudEvent → case resolution pipeline | `@QuarkusTest` with `InMemorySituationStore` + engine runtime |
| LLM workers | Agent output parsing, prompt construction | Mock `AgentProvider` returning recorded `Multi<AgentEvent>` sequences — never call live Claude API in CI |

**LLM test fixtures:** Pre-recorded agent responses stored as JSON test resources. Workers tested with mock `AgentProvider` that replays recorded `TextDelta` events. Live Claude calls are manual verification only, never automated.

### Transaction Boundaries

- **Worker execution:** Each worker runs in its own transaction. Worker failure does not roll back prior case context writes.
- **CDI async observers** (`@ObservesAsync CaseLifecycleEvent`): Run in a new transaction context. Attestation writes, CBR retain, and push broadcasts are independent — a CBR write failure does not roll back the case completion.
- **Idempotency:** CDI events may fire more than once (event replay after crash). Attestation and CBR retain must be idempotent — check for existing entries before writing. Use `caseId + eventType` as deduplication key.
- **Ledger writes:** Always through `LedgerEntryRepository` (never direct table access). The repository handles Merkle chain consistency within a single transaction.

### Binding Execution Model

Case YAML bindings with `on: { contextChange: {} }` are **reactive, not sequential**. All bindings are re-evaluated on every context change, and those whose `when` guard is true fire in parallel. The sequential appearance in SOC's investigation pipeline emerges from data dependencies in the `when` guards (each checks for the prior stage's output), not from ordered execution. If future bindings are added without strict data dependencies, they will fire concurrently.
