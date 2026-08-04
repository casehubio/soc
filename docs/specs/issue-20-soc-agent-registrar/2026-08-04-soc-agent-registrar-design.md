# SocAgentRegistrar — Agent Descriptor Registration

**Issue:** casehubio/soc#20
**Date:** 2026-08-04
**Status:** Approved

## Problem

SOC has 6 workers (3 rule-based, 3 LLM) registered via `SocCaseHub.augment()`. Without agent descriptors, `AgentCandidateFactory` skips `CapabilityHealth.probe()` and defaults all workers to `AgentHealth.READY`. This means:

- No capability health monitoring — degraded or unavailable workers still receive work
- No epistemic domain modeling — routing cannot discriminate by threat context
- No integration with the eidos agent registry — workers are invisible to agent discovery
- No disposition metadata — trust-weighted routing (Layer 4a) has no structural data to work with

## Architecture: Two Registration Paths

Both paths must be wired. There is no auto-bridging between them.

### Path 1 — Eidos Registration

`AgentDescriptorRegistrar` (SPI) → `AgentDescriptorBootstrap` collects all CDI implementations at startup via `@Any Instance<AgentDescriptorRegistrar>` → `DescriptorCollector.collectAndValidate()` → `AgentRegistry.register()`.

Requires `casehub-eidos-runtime` on the classpath — `AgentDescriptorBootstrap` lives there. Gated by `@IfBuildProperty(name = "casehub.eidos.reactive.enabled", stringValue = "false", enableIfMissing = true)` — active by default in non-reactive mode.

Bootstrap validation injects `TemplateRegistry`, `VocabularyRegistry`, and `BriefingCoherenceValidator` via `DescriptorCollector` — these CDI beans must be satisfiable (eidos-runtime and eidos-memory provide default implementations).

Enables: agent discovery, registry queries, persistent agent identity in eidos.

### Path 2 — Engine Wiring

`CaseDefinition.setAgentDescriptors(Map<String, AgentDescriptor>)` → `AgentCandidateFactory.buildCandidates()` calls `caseDefinition.agentDescriptorFor(w.name())` → probes `CapabilityHealth.probe()` → maps `CapabilityStatus` to `AgentHealth` → routing strategies consume health.

Mapping (actual engine behavior in `AgentCandidateFactory`):
- `CapabilityStatus.Unavailable` → **excluded from candidate list** (only status that triggers exclusion)
- `CapabilityStatus.EpistemicallyWeak` → `AgentHealth.EPISTEMICALLY_WEAK`
- `CapabilityStatus.Degraded` → `AgentHealth.DEGRADED`
- `CapabilityStatus.Ready` → `AgentHealth.READY`
- `CapabilityStatus.Excluded` → `AgentHealth.READY` (falls to `default` branch — engine gap)
- `CapabilityStatus.BehavioralViolation` → `AgentHealth.READY` (falls to `default` branch — engine gap)

Note: `DefaultCapabilityHealth` in eidos-runtime handles Excluded and BehavioralViolation at the probing level — it returns these statuses based on signal stores and exclusion lists. The engine's switch statement should map them to exclusion rather than READY. This is a known engine gap but does not block this work — `DefaultCapabilityHealth` returns `Unavailable` for undeclared capabilities and `EpistemicallyWeak`/`Degraded` for the cases SOC cares about in Bootstrap phase.

## Design Decisions

**Programmatic over YAML.** Descriptors are intrinsically coupled to workers defined in Java — worker names, capability names, and output types are Java constants. YAML would split the definition across two files with no compile-time consistency guarantee. Additionally, `augment()` needs programmatic access to the same descriptors, so YAML would require a second parse path.

**All 6 workers registered regardless of LLM model availability.** LLM workers with `noFunction()` still get descriptors. The health probing layer handles availability — registration is about identity, not operational state. Clean separation of concerns.

**Descriptor definitions in api/, CDI registration in app/.** `SocAgentDescriptors` is pure-Java domain metadata (api tier). `SocAgentRegistrar` is a CDI bean implementing the eidos SPI (app tier). Follows the existing module split.

**MITRE ATT&CK tactics as epistemic domains.** SOC's domain IS threat intelligence. The `AttackTactic` enum (14 enterprise tactics) provides the natural domain vocabulary. Rule-based workers declare high confidence (1.0) in tactics they cover. LLM workers declare high confidence (0.9) across all tactics — they are general-purpose reasoners; trust scoring learns the real distribution from outcomes.

**Full disposition modeling.** Rule-based and LLM workers have genuinely different operational characteristics. Capturing these now provides structural data for trust-weighted routing in Layer 4a.

## New Dependencies

**api/pom.xml** — add `casehub-eidos-api` as explicit compile dependency:

```xml
<dependency>
    <groupId>io.casehub</groupId>
    <artifactId>casehub-eidos-api</artifactId>
</dependency>
```

Currently transitive through `casehub-engine` → `casehub-eidos-api`. Making it explicit because SOC now imports directly from `io.casehub.eidos.api`.

**app/pom.xml** — add `casehub-eidos-runtime` and `casehub-eidos-memory`:

```xml
<dependency>
    <groupId>io.casehub</groupId>
    <artifactId>casehub-eidos-runtime</artifactId>
    <version>${casehub.version}</version>
</dependency>
<dependency>
    <groupId>io.casehub</groupId>
    <artifactId>casehub-eidos-memory</artifactId>
    <version>${casehub.version}</version>
</dependency>
```

`casehub-eidos-runtime` provides `AgentDescriptorBootstrap` (discovers registrars at startup), `DefaultCapabilityHealth` (real health probing with epistemic domains, exclusions, behavioral violations), and `DescriptorCollector` (validation pipeline). Without it, both registration paths are inert — Path 1 has no bootstrap, Path 2 uses `NoOpCapabilityHealth` (engine fallback, always returns READY).

`casehub-eidos-memory` provides `InMemoryAgentRegistry`, `InMemoryAgentStateStore`, `InMemoryBehavioralSignalStore` — required for dev/test. Production would use JPA implementations from eidos-runtime.

## Components

### `SocAgentDescriptors` — api/

**Package:** `io.casehub.soc.domain`

Pure-Java class with static factory methods. No CDI, no Quarkus dependencies.

**Public API:**

```java
// Individual descriptor factories
static AgentDescriptor ruleIocEnrichment()
static AgentDescriptor llmIocEnrichment()
static AgentDescriptor ruleAttckMapping()
static AgentDescriptor llmAttckMapping()
static AgentDescriptor ruleContainmentRecommendation()
static AgentDescriptor llmContainmentRecommendation()

// Aggregate accessors
static List<AgentDescriptor> all()
static Map<String, AgentDescriptor> descriptorsByWorkerName()
```

**Descriptor fields per worker:**

| Field | Rule-based | LLM |
|-------|-----------|-----|
| agentId | `soc:rule-{capability}` | `soc:llm-{capability}` |
| name | `Rule-Based {Capability}` | `LLM {Capability}` |
| slot | `incident-investigation` | `incident-investigation` |
| tenancyId | `default` | `default` |
| version | `1.0.0` | `1.0.0` |
| provider | `casehub-soc` | `casehub-soc` |
| modelFamily | `null` | `anthropic` |
| modelVersion | `null` | `null` (runtime-determined) |

Remaining `AgentDescriptor` fields (`weightsFingerprint`, `domainVocabulary`, `slotVocabulary`, `dispositionVocabulary`, `axisVocabularies`, `jurisdiction`, `dataHandlingPolicy`, `briefing`, `templates`, `goals`, `constraints`) are intentionally null/empty. `briefing`, `goals`, and `constraints` are candidates for future enrichment but are not required for health probing or routing.

**Capability per worker:**

Each descriptor declares exactly one `AgentCapability` with:
- `name` matching the case YAML capability (`"ioc-enrichment"`, `"attck-mapping"`, `"containment-recommendation"`)
- `qualityHint`: rule-based = 0.95, LLM = 0.85
- `epistemicDomains`: `Map<String, Double>` keyed by `AttackTactic.name()`

**Epistemic domain coverage:**

Rule-based workers declare confidence only for tactics covered by their lookup logic:

- **IOC enrichment (rule):** `INITIAL_ACCESS(1.0)`, `EXECUTION(1.0)`, `COMMAND_AND_CONTROL(1.0)`, `EXFILTRATION(1.0)` — tactics where IOC types (IP, hash, domain, URL) are primary indicators
- **ATT&CK mapping (rule):** all 14 tactics at 1.0 — `AttckLookupTable` has explicit mappings for all
- **Containment (rule):** `INITIAL_ACCESS(1.0)`, `LATERAL_MOVEMENT(1.0)`, `EXECUTION(1.0)`, `PERSISTENCE(1.0)`, `COMMAND_AND_CONTROL(1.0)` — tactics where containment actions (isolate host, block IP, kill process) directly apply

LLM workers: all 14 tactics at 0.9 across all three capabilities.

**Disposition:**

Built via `AgentDisposition.builder()`. Axis values are strings passed to builder convenience methods (e.g., `ruleFollowing("strict")`) which wrap in `List.of(DispositionValue.of(value))`. Null axes become empty lists — meaning "no value declared for this axis."

| Axis | Rule-based | LLM |
|------|-----------|-----|
| ruleFollowing | `"strict"` | `"moderate"` |
| autonomy | `"none"` | `"guided"` |
| riskAppetite | `"averse"` | `"moderate"` |
| socialOrient | null (empty list) | null (empty list) |
| conflictMode | null (empty list) | null (empty list) |
| delegation | `false` | `true` |

### `SocAgentRegistrar` — app/

**Package:** `io.casehub.soc.engine`

```java
@ApplicationScoped
public class SocAgentRegistrar implements AgentDescriptorRegistrar {
    @Override
    public List<AgentDescriptor> descriptors() {
        return SocAgentDescriptors.all();
    }
}
```

Discovered by `AgentDescriptorBootstrap` at startup. Delegates entirely to `SocAgentDescriptors`.

### `SocCaseHub.augment()` — app/ (modification)

Expand the existing method to also wire descriptors into the case definition:

```java
@Override
protected void augment(CaseDefinition definition) {
    var descriptor = new SocInvestigationCaseDescriptor();
    definition.getWorkers().addAll(descriptor.workers());
    definition.setAgentDescriptors(SocAgentDescriptors.descriptorsByWorkerName());
}
```

The map keys are worker names (`"rule-ioc-enrichment"`, `"llm-ioc-enrichment"`, etc.) matching what workers return from `Worker.name()` and what `AgentCandidateFactory` looks up via `caseDefinition.agentDescriptorFor(w.name())`.

## Runtime Behaviour Change

**Before (Layer 2 default):**
`AgentCandidateFactory` → `descriptor == null` → `new CapabilityStatus.Ready()` → all workers always READY → routing selects by insertion order. Active `CapabilityHealth` bean: `NoOpCapabilityHealth` (engine, `@DefaultBean`, always READY).

**After (with eidos-runtime on classpath):**
`AgentCandidateFactory` → `descriptor != null` → `capabilityHealth.probe(descriptor, capabilityName, context)` → `DefaultCapabilityHealth` (eidos-runtime, `@DefaultBean`, displaces `NoOpCapabilityHealth`) evaluates: operational degradation (AgentStateStore), capability resolution (CapabilityResolver), declared/learned exclusions, epistemic weakness, behavioral violations → workers can be EPISTEMICALLY_WEAK, DEGRADED, or UNAVAILABLE (excluded) → routing strategies can discriminate on health.

**ProbeContext limitation:** `AgentCandidateFactory` currently passes `ProbeContext.of(caseInstance.getUuid().toString())` — a case UUID, not a meaningful task domain. This means `DefaultCapabilityHealth`'s domain-dependent checks (steps 3-5: declared exclusions, learned exclusions, epistemic weakness) will not discriminate based on threat context until the engine enriches the ProbeContext with actual domain metadata. The epistemic domains declared on descriptors are forward-looking — they are correct to model now and will become active when the engine wires domain context into ProbeContext.

## Test Plan

### `SocAgentDescriptorsTest` (api/)

- All 6 factory methods return valid descriptors (pass `AgentDescriptorValidator`)
- Agent IDs are unique across all 6
- Capability names match case YAML capability names (`ioc-enrichment`, `attck-mapping`, `containment-recommendation`) — NOT `SocCapabilities` constants (which use `soc:` prefixed tag format for a different purpose)
- Worker names in `descriptorsByWorkerName()` keys match worker names from `SocInvestigationCaseDescriptor.workers()`
- Rule-based epistemic domains are subset of all 14 MITRE tactics, all at 1.0
- LLM epistemic domains cover all 14 MITRE tactics at 0.9
- Rule-based disposition: ruleFollowing=strict, autonomy=none, riskAppetite=averse, delegation=false
- LLM disposition: ruleFollowing=moderate, autonomy=guided, riskAppetite=moderate, delegation=true
- `all()` returns exactly 6 descriptors
- `descriptorsByWorkerName()` has 6 entries

### `SocAgentRegistrarTest` (app/)

- CDI discovers `SocAgentRegistrar` as an `AgentDescriptorRegistrar` implementation
- `descriptors()` returns all 6 descriptors
- All descriptors pass validation (no `AgentValidationException`)

### `SocCaseHubTest` update (app/)

- After `getDefinition()`, `agentDescriptorFor(workerName)` returns present Optional for all 6 worker names
- `agentDescriptorFor("nonexistent")` returns empty Optional
- Descriptor capability names match the case definition capability names

## Files Changed

| File | Change |
|------|--------|
| `api/pom.xml` | Add `casehub-eidos-api` explicit dependency |
| `app/pom.xml` | Add `casehub-eidos-runtime` + `casehub-eidos-memory` dependencies |
| `api/.../domain/SocAgentDescriptors.java` | New — descriptor factory |
| `app/.../engine/SocAgentRegistrar.java` | New — CDI registrar bean |
| `app/.../engine/SocCaseHub.java` | Add `setAgentDescriptors()` call in `augment()` |
| `api/.../domain/SocAgentDescriptorsTest.java` | New — descriptor validation tests |
| `app/.../engine/SocAgentRegistrarTest.java` | New — CDI integration test |
| `app/.../engine/SocCaseHubTest.java` | Add descriptor wiring assertions |

## Garden Context

- GE-20260803-2dd865: `LeastLoadedAgentStrategy` CDI ambiguity — not directly applicable here (SocAgentRegistrar doesn't conflict with existing beans) but relevant context for CDI routing
- GE-20260730-5b3fa1: `ImplementationRoutingStrategy` dispatch path — confirms `ComposableAgentRoutingStrategy` is the actual dispatch point, validates that descriptors reach routing via `AgentCandidateFactory`
