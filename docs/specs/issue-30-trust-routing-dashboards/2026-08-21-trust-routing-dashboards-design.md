# Phase 3: Trust & Routing Dashboards — Design Spec

**Date:** 2026-08-21
**Issue:** casehubio/soc#30 — Phase 3: Trust & routing dashboards
**Branch:** issue-30-trust-routing-dashboards
**Parent:** casehubio/soc#26 — Epic: SOC Incident Response Web Application
**Review:** Light decision review (9 findings, all resolved) + Light spec review (7 findings, all resolved)

---

## Overview

Adds the Trust tab to the SOC web application — a hybrid dashboard showing agent fleet health and per-case routing rationale. The view answers two questions: "How are my agents performing?" (fleet overview) and "Why was this case routed this way?" (routing drill-down with CBR similarity context).

The design composes from existing blocks-ui components — `blocks-trust-score-panel`, `blocks-routing-rationale`, and `blocks-similarity-panel` — rather than building parallel SOC-specific components. One new SOC component (`soc-cbr-summary`) adds an outcome statistics banner above the similarity panel.

Routing rationale data comes from `WorkerDecisionEntry.routingRationale`, which stores a `SelectionContext` JSON at routing time — including at-routing-time trust score, all candidates, pipeline phases, and human-readable reasons. The REST endpoint enriches this persisted data with current trust metadata (observations, maturity phase, workload scores) from `ActorTrustScoreRepository` to match the `blocks-routing-rationale` component's `CandidateScore` contract.

**Scope:** Trust view (TypeScript), REST endpoints (Java), SSE topic wiring. No changes to existing views. No platform changes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — Trust Tab                                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Fleet Overview (always visible)                           │ │
│  │  6 × <blocks-trust-score-panel> in CSS grid (3×2)         │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │ │
│  │  │ rule-ioc-enr │ │ llm-ioc-enr  │ │ rule-attck   │      │ │
│  │  │ ■■■■■■░░ 0.82│ │ ■■■■░░░░ 0.65│ │ ■■■■■■■░ 0.91│      │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │ │
│  │  │ llm-attck    │ │ rule-contain │ │ llm-contain  │      │ │
│  │  │ ■■■■■■░░ 0.85│ │ ■■■■■■■░ 0.95│ │ ■■■■■░░░ 0.70│      │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Routing Drill-Down (case-selected)                        │ │
│  │  ┌── Recent ──┬── Rationale ──────┬── CBR ────────────┐   │ │
│  │  │ INC-01 ◀   │ <routing-rationale│ <soc-cbr-summary> │   │ │
│  │  │ INC-02     │  per capability>  │  80% confirmed    │   │ │
│  │  │ INC-03     │ ioc-enrichment:   │  avg 24m MTTR     │   │ │
│  │  │            │  rule 0.82 ✓      │ <similarity-panel> │   │ │
│  │  │            │  llm  0.65        │  INC-44  0.87     │   │ │
│  │  │            │ attck-mapping:    │  INC-31  0.72     │   │ │
│  │  │            │  rule 0.91 ✓      │  INC-22  0.68     │   │ │
│  │  └────────────┴──────────────────┴────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
          │ HTTP / SSE
┌─────────┼────────────────────────────────────────────────────┐
│  Quarkus│(Quinoa)                                             │
│  ┌──────┴───────────────────────────────────────────────────┐ │
│  │ JAX-RS Resources (app/)                                   │ │
│  │  SocTrustResource  → ActorTrustScoreRepository            │ │
│  │                    → CaseLedgerEntryRepository             │ │
│  │                    → SocAgentDescriptors                   │ │
│  │  SocCbrResource    → SocCbrRetrieveService                │ │
│  │  SocTrustPush      → EventBroadcaster                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Layout

### Hybrid Structure (D1)

**Top zone — Fleet Overview:** Always visible. A `blocks-kpi-metric-row` showing fleet-level aggregate metrics (mean trust score, total observations, capability coverage), followed by a CSS grid (3×2) of 6 `blocks-trust-score-panel` instances, one per SOC agent. Each panel shows the agent's global trust score, dimension breakdown (triage-accuracy, containment-appropriateness), observation counts, and maturity phase. Panels use `mode="compact"` for a condensed card layout.

**Bottom zone — Routing Drill-Down:** Three columns (25/40/35). Left: recent resolved cases list. Centre: `blocks-routing-rationale` instances — one per capability in the selected case, stacked vertically. Right: `soc-cbr-summary` banner + `blocks-similarity-panel` for CBR similar incidents.

### TypeScript View Structure

```typescript
// trust/trust-view.ts
import { rows, columns, html as pagesHtml } from "@casehubio/pages-ui";
import type { Component } from "@casehubio/pages-ui";
import "@casehubio/blocks-ui-trust-score-panel";
import "@casehubio/blocks-ui-routing-rationale";
import "@casehubio/blocks-ui-similarity-panel";
import "./soc-cbr-summary.js";

const SOC_AGENTS = [
  "soc:rule-ioc-enrichment", "soc:llm-ioc-enrichment",
  "soc:rule-attck-mapping",  "soc:llm-attck-mapping",
  "soc:rule-containment-rec","soc:llm-containment-rec",
];

export function trustView(): Component {
  return rows(
    fleetOverview(),
    drillDown()
  );
}

function fleetOverview(): Component {
  const panels = SOC_AGENTS.map(id =>
    `<blocks-trust-score-panel
       mode="compact"
       endpoint="/api/soc"
       actor-id="${id}"
     ></blocks-trust-score-panel>`
  ).join("");
  return pagesHtml(`<div class="trust-fleet-grid">${panels}</div>`);
}

function drillDown(): Component {
  return columns([25, 40, 35],
    [recentCasesList()],
    [routingRationale()],
    [similaritySection()]
  );
}
```

---

## Components

### `blocks-trust-score-panel` (existing blocks-ui)

Used 6 times in the fleet grid. Each instance receives `actor-id` and `endpoint="/api/soc"` — the component internally resolves to `/api/soc/trust/{actorId}`. Renders global score, dimension bars, observation counts, and maturity phase.

**CSS grid wrapper:** A `<div class="trust-fleet-grid">` with:
```css
.trust-fleet-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
}
```

### `blocks-routing-rationale` (existing blocks-ui)

Used N times in the rationale column — one per capability in the selected case. Each instance receives `RoutingRationaleData` with the full `CandidateScore` set (9 fields) and `RoutingPolicySummary` (7 fields).

**Data mapping:** `SelectionContext` (persisted in `WorkerDecisionEntry.routingRationale`) carries 4 fields per candidate (`workerId`, `score`, `phase`, `reason`). The REST endpoint enriches each candidate to the full `CandidateScore` by querying `ActorTrustScoreRepository`:

| CandidateScore field | Source |
|---|---|
| `workerId` | `SelectionContext.SelectedCandidate.workerId` |
| `trustScore` | `WorkerDecisionEntry.trustScoreAtRouting` (selected) or `ActorTrustScoreRepository` (alternatives) |
| `workloadScore` | Default 0.0 (workload data not persisted — acceptable for v1) |
| `phase` | Map from `ActorTrustScore.decisionCount` and score: <5 obs → BOOTSTRAP, score < threshold → BORDERLINE, else QUALIFIED |
| `observations` | `ActorTrustScore.decisionCount` |
| `finalScore` | `SelectionContext.SelectedCandidate.score` |
| `exclusionReason` | null unless phase is EXCLUDED |
| `rationale` | `SelectionContext.SelectedCandidate.reason` |
| `additionalScores` | null |

`RoutingPolicySummary` is partially filled: `threshold` from `WorkerDecisionEntry.thresholdApplied`, remaining fields from routing policy configuration (or defaults when unavailable).

**Note:** `SelectionContext.SelectedCandidate.phase` is a routing pipeline phase (e.g. "trust", "cbr"), while `CandidateScore.phase` is a trust maturity phase (BOOTSTRAP/QUALIFIED/BORDERLINE). The endpoint maps between these — `SelectionContext.phase` is not passed through directly.

### `blocks-similarity-panel` (existing blocks-ui)

Shows CBR similar incidents as a sortable table with similarity progress bars and outcome badges. The `Precedent` interface's `[key: string]: unknown` extension carries SOC-specific fields (alertType, attckTechniqueIds, playbook) without interface changes.

### `soc-cbr-summary` (NEW — SOC-specific)

Thin Lit wrapper rendering an outcome statistics banner above `blocks-similarity-panel`. Computes aggregate stats from the endpoint response and displays:
- Dominant outcome: "{percent}% of {total} similar incidents were {outcome}"
- Resolution time: "Avg resolution: {minutes} min"
- Colour-coded by dominant outcome (green=resolved, amber=escalated, red=false-positive)

**Package:** `app/src/main/webui/src/trust/soc-cbr-summary.ts`

**Data flow:** `soc-cbr-summary` fetches `/api/soc/cbr/similar/{caseId}`, which returns `{ summary: {...}, incidents: [...] }`. The wrapper renders the summary banner, then passes `incidents` as `Precedent[]` to the child `blocks-similarity-panel` via its `data` property. The similarity panel does NOT independently fetch — it receives data from its parent.

**Field mapping** (REST response → `Precedent` interface):
- `similarityScore` → `similarity`
- `severityOutcome` → `outcome` (primary outcome for display)
- `investigationDurationMinutes` → `resolutionTime` (formatted as "{N}m")
- SOC extension fields (`alertType`, `attckTechniqueIds`, `playbook`) pass through via `[key: string]: unknown`

### Recent Cases List

Compact HTML list of recent resolved incidents — clickable rows showing case ID, severity badge, status, and relative time. Fetches from `/api/soc/incidents?size=20`. Selection emits a `pages-event` on topic `trust:case-selected`.

---

## REST Endpoints

| Endpoint | Method | Returns | Source |
|---|---|---|---|
| `/api/soc/trust/fleet-kpis` | GET | Fleet aggregate metrics | `ActorTrustScoreRepository.findAll()` → aggregate |
| `/api/soc/trust/{agentId}` | GET | Agent trust scores | `ActorTrustScoreRepository.findByActorIdAndScoreType()` |
| `/api/soc/trust/routing/{caseId}` | GET | Routing rationale for a case | `CaseLedgerEntryRepository.findWorkerDecisionsByCaseId()` → deserialize `routingRationale` |
| `/api/soc/cbr/similar/{caseId}` | GET | Similar incidents with summary | `SocCbrRetrieveService.retrieve()` + outcome aggregation |

### SocTrustResource

```java
@Path("/api/soc/trust")
@ApplicationScoped
public class SocTrustResource {

    @Inject ActorTrustScoreRepository trustRepo;
    @Inject CaseLedgerEntryRepository ledgerRepo;
    @Inject CaseInstanceRepository caseRepo;

    @GET @Path("/{agentId}")
    public Map<String, Object> getAgentTrust(@PathParam("agentId") String agentId) {
        // Query ActorTrustScoreRepository.findByActorIdAndScoreType(agentId, BAYESIAN)
        // Return global score + dimension breakdown + observation counts
        // Used by blocks-trust-score-panel instances in fleet grid
        // Note: trust scores are not tenant-scoped — no CurrentPrincipal needed
    }

    @GET @Path("/routing/{caseId}")
    public List<Map<String, Object>> getRoutingRationale(@PathParam("caseId") UUID caseId) {
        // 1. CaseLedgerEntryRepository.findWorkerDecisionsByCaseId(caseId)
        // 2. For each WorkerDecisionEntry with routingRationale != null:
        //    - Deserialize routingRationale JSON to SelectionContext
        //    - Map SelectionContext to RoutingRationaleData contract:
        //      - strategyId from SelectionContext
        //      - selected/alternatives: enrich with display names from SocAgentDescriptors
        //      - trustScoreAtRouting and thresholdApplied from the entry fields
        //    - Build RoutingPolicySummary from the policy data in SelectionContext
        // 3. Return list of RoutingRationaleData, one per capability
        //
        // Entries with null routingRationale (pre-field-addition) return
        // a minimal rationale showing only the selected worker and capability.
    }
}
```

### SocCbrResource

```java
@Path("/api/soc/cbr")
@ApplicationScoped
public class SocCbrResource {

    @Inject SocCbrRetrieveService cbrService;
    @Inject CaseInstanceRepository caseRepo;
    @Inject CurrentPrincipal currentPrincipal;

    @GET @Path("/similar/{caseId}")
    public Map<String, Object> getSimilar(@PathParam("caseId") UUID caseId) {
        String tenantId = currentPrincipal.tenancyId();
        // 1. Load case context from CaseInstanceRepository
        // 2. Call cbrService.retrieve(caseContext, tenantId)
        // 3. Aggregate outcomes into summary stats:
        //    - totalSimilar, outcomes (resolved/escalated/false-positive counts)
        //    - avgResolutionMinutes, dominantOutcome, dominantOutcomePercent
        // 4. Map each ScoredCbrCase to Precedent (similarity, outcome, resolutionTime)
        //    + SOC extension fields (alertType, attckTechniqueIds, playbook)
        // 5. Return { summary: {...}, incidents: [...] }
    }
}
```

### Routing Rationale Data Flow

```
WorkerDecisionEntry (persisted at routing time)
  ├── routingRationale: JSON → SelectionContext (4 fields/candidate)
  │     ├── strategyId: "trust-weighted"
  │     ├── selected: { workerId, score, phase, reason }
  │     └── alternatives: [{ workerId, score, phase, reason }, ...]
  ├── trustScoreAtRouting: 0.82
  └── thresholdApplied: 0.5

        │ SocTrustResource.getRoutingRationale()
        │   1. deserialize SelectionContext
        │   2. enrich with ActorTrustScoreRepository (observations, maturity phase)
        │   3. enrich with SocAgentDescriptors (display names)
        │   4. build RoutingPolicySummary (threshold from entry, rest from config)
        ▼

RoutingRationaleData (blocks-ui contract, 9 fields/candidate)
  ├── capabilityTag: "ioc-enrichment"
  ├── strategyId: "trust-weighted"
  ├── selected: CandidateScore (trustScore from entry, observations/phase from repo)
  ├── alternatives: CandidateScore[] (enriched same way)
  └── policy: RoutingPolicySummary (threshold from entry, rest from config/defaults)

        │ blocks-routing-rationale component
        ▼

Visual: trust score bars, threshold markers, phase badges,
        exclusion reasons, policy summary, rationale text
```

**What is persisted (accurate):** at-routing-time trust score, final blended score, strategy ID, reason text, which agent was selected and why.
**What is enriched from current state:** observation counts, maturity phase, workload score (defaulted to 0.0), routing policy configuration. These enrichments use current values, not at-routing-time values — acceptable because they are supplementary metadata, not the core routing decision.

---

## SSE Push (D4)

### New Topic: `soc:trust`

```java
@ApplicationScoped
public class SocTrustPushService {

    @Inject EventBroadcaster broadcaster;

    void onTrustScoreUpdated(@ObservesAsync TrustScoreActorUpdatedEvent event) {
        broadcaster.broadcast("soc:trust", event);
    }
}
```

### Refresh Configuration

All three modes supported, UI-configurable:
- `push` — SSE subscription to `soc:trust` topic (real-time on `TrustScoreActorUpdatedEvent`)
- `poll` — periodic refetch at configurable interval (default 30s)
- `manual` — fetch on load and on explicit user action only

Default: `poll`. Fleet grid polls; drill-down panels use manual (they refresh on case selection, not time).

---

## Integration with index.ts

Replace the Trust placeholder:

```typescript
// Before:
["Trust", placeholder("Trust", "Phase 3")],

// After:
["Trust", trustView()],
```

Add selection wiring in `boot()`:
```typescript
wireTrustCaseSelection();
initTrustFromUrl();
```

### Selection Wiring (trust-selection.ts)

```typescript
import { onPagesEvent, emitPagesEvent } from "@casehubio/blocks-ui-core";
import type { RoutingRationaleData } from "@casehubio/blocks-ui-routing-rationale";

export function wireTrustCaseSelection(): void {
  onPagesEvent<{ id: string }>(document, "trust:case-selected", async ({ id }) => {
    if (!id) {
      clearDrillDown();
      return;
    }

    // Fetch routing rationale and CBR data in parallel
    const [rationaleResp, cbrResp] = await Promise.all([
      fetch(`/api/soc/trust/routing/${id}`),
      fetch(`/api/soc/cbr/similar/${id}`),
    ]);

    // Populate routing rationale — create one blocks-routing-rationale per capability
    const container = document.getElementById("trust-rationale-container");
    if (container && rationaleResp.ok) {
      const rationales: RoutingRationaleData[] = await rationaleResp.json();
      container.innerHTML = "";
      for (const r of rationales) {
        const el = document.createElement("blocks-routing-rationale");
        (el as any).data = r;
        container.appendChild(el);
      }
    }

    // Populate CBR summary + similarity panel
    const cbrSummary = document.getElementById("trust-cbr-summary") as any;
    if (cbrSummary && cbrResp.ok) {
      const cbrData = await cbrResp.json();
      cbrSummary.summaryData = cbrData.summary;
      cbrSummary.incidents = cbrData.incidents;
    }
  });
}

export function initTrustFromUrl(): void {
  const hash = location.hash;
  const match = hash.match(/trust\/([a-f0-9-]+)/);
  if (match) {
    emitPagesEvent(document, "trust:case-selected", { id: match[1] });
  }
}

function clearDrillDown(): void {
  const container = document.getElementById("trust-rationale-container");
  if (container) container.innerHTML = "<p>Select a case to view routing rationale</p>";
  const cbr = document.getElementById("trust-cbr-summary") as any;
  if (cbr) { cbr.summaryData = null; cbr.incidents = []; }
}
```

**Event flow:** Recent cases list emits `trust:case-selected` with `{ id: caseUuid }` → `wireTrustCaseSelection` listener → parallel fetch of routing rationale + CBR data → dynamic creation of N `blocks-routing-rationale` elements + update of `soc-cbr-summary` data properties.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| No trust scores yet (fresh system) | Trust-score-panel instances show "No data" / initial state |
| Case has no WorkerDecisionEntries | Rationale column shows "No routing data for this case" |
| WorkerDecisionEntry has null routingRationale | Show minimal rationale — worker name + capability only, no comparison |
| CBR retrieval fails or returns empty | Summary banner hidden, similarity panel shows "No similar incidents" |
| SSE disconnect | Falls back to poll mode (pages framework EventStreamController reconnection) |

---

## Testing Strategy

| Level | What | How |
|---|---|---|
| Unit | `SocTrustResource.getAgentTrust()` returns scores for a known agent | `@QuarkusTest` with seeded `ActorTrustScore` records |
| Unit | `SocTrustResource.getRoutingRationale()` deserializes `routingRationale` correctly | `@QuarkusTest` with seeded `WorkerDecisionEntry` including JSON rationale |
| Unit | `SocTrustResource.getRoutingRationale()` handles null `routingRationale` gracefully | `@QuarkusTest` with entry missing rationale field |
| Unit | `SocCbrResource.getSimilar()` computes outcome summary correctly | `@QuarkusTest` with mock `SocCbrRetrieveService` |
| Unit | `soc-cbr-summary` computes banner text from summary data | TypeScript test |
| Integration | Fleet grid renders 6 trust-score-panel instances with data | `@QuarkusTest` + Quinoa dev server |
| Integration | Case selection populates routing rationale + similarity | `@QuarkusTest` with seeded case + routing data |

---

## Files Changed

| File | Change |
|---|---|
| `app/src/main/java/io/casehub/soc/rest/SocTrustResource.java` | New — agent trust + routing rationale endpoints |
| `app/src/main/java/io/casehub/soc/rest/SocCbrResource.java` | New — CBR similar incidents endpoint |
| `app/src/main/java/io/casehub/soc/rest/SocTrustPushService.java` | New — SSE push for trust updates |
| `app/src/test/java/io/casehub/soc/rest/SocTrustResourceTest.java` | New |
| `app/src/test/java/io/casehub/soc/rest/SocCbrResourceTest.java` | New |
| `app/src/test/java/io/casehub/soc/rest/SocTrustPushServiceTest.java` | New |
| `app/src/main/webui/src/trust/trust-view.ts` | New — Trust tab layout |
| `app/src/main/webui/src/trust/trust-selection.ts` | New — case selection wiring |
| `app/src/main/webui/src/trust/soc-cbr-summary.ts` | New — CBR summary banner wrapper |
| `app/src/main/webui/src/index.ts` | Modified — replace Trust placeholder with trustView() |
| `app/src/main/webui/package.json` | Modified — add `@casehubio/blocks-ui-trust-score-panel`, `@casehubio/blocks-ui-routing-rationale`, `@casehubio/blocks-ui-similarity-panel` dependencies |

---

## References

- `docs/specs/issue-26-soc-web-app/2026-08-14-soc-web-app-design.md` — Phase 3 layout definition
- `docs/specs/issue-21-trust-cbr-compliance/2026-08-10-trust-attestation-design.md` — trust attestation flow
- `blocks-ui/components/routing-rationale/src/types.ts` — RoutingRationaleData, CandidateScore (9 fields)
- `blocks-ui/components/trust-workbench/src/trust-workbench.ts` — existing composite (agent-centric; SOC is case-centric)
- `blocks-ui/components/trust-score-panel/` — fleet grid instances
- `blocks-ui/components/similarity-panel/src/types.ts` — Precedent interface with extension point
- `io.casehub.ledger.model.WorkerDecisionEntry` — `routingRationale`, `trustScoreAtRouting`, `thresholdApplied`
- `io.casehub.engine.common.spi.event.SelectionContext` — routing decision record
- `io.casehub.ledger.runtime.model.ActorTrustScore` — trust score entity
- `api/src/main/java/io/casehub/soc/domain/SocAgentDescriptors.java` — 6 SOC agents
- `app/src/main/java/io/casehub/soc/engine/cbr/SocCbrRetrieveService.java` — CBR retrieve API
- Garden: Trust Attestation Design, CBR and Incident Retention, Phase 1 Incidents View

## Review Findings Resolved

| Finding | Resolution |
|---|---|
| R1-01: routing decision log already exists | Use `WorkerDecisionEntry.routingRationale` directly |
| R1-02: use `blocks-routing-rationale` | Adopted — full CandidateScore (9 fields) |
| R1-03: implicit abandonment of `blocks-trust-workbench` | Explicit: trust-workbench is agent-centric; SOC is case-centric. Compose from primitives instead. |
| R1-04: use `blocks-similarity-panel` | Adopted — SOC adds summary banner wrapper only |
| R1-05: use `blocks-trust-score-panel` | Adopted — 6 instances in CSS grid |
| R1-06: SSE event name wrong | Fixed — `TrustScoreActorUpdatedEvent` |
| R1-07: D6→D7 cascade | Eliminated — both use persisted routing data |
| R1-08: D7 needed deeper exploration | Acknowledged — root cause was failure to read `WorkerDecisionEntry` fields |
| R1-09: implicit decisions not debated | All resolved — blocks-ui components adopted where they exist |

### Spec Review Findings Resolved

| Finding | Resolution |
|---|---|
| S-R1-01: SelectionContext (4 fields) doesn't match CandidateScore (9 fields) | Documented enrichment mapping table — endpoint enriches persisted data with current trust metadata |
| S-R1-02: trust-score-panel endpoint URL doubling | Fixed — `endpoint="/api/soc"` (component appends `/trust/{actorId}`) |
| S-R1-03: similarity panel expects Precedent[] but gets wrapper | `soc-cbr-summary` fetches wrapper, passes `incidents` to similarity panel via `data` property. Field mapping documented. |
| S-R1-04: kpi-metric-row missing from Trust view | Added fleet KPI row above the agent grid + `/api/soc/trust/fleet-kpis` endpoint |
| S-R1-05: trust-selection wiring undefined | Full `wireTrustCaseSelection()` implementation with parallel fetch, dynamic component creation, and CBR data flow |
| S-R1-06: package.json omitted from Files Changed | Added to Files Changed table |
| S-R1-07: CurrentPrincipal injected but usage undocumented | Removed from SocTrustResource (not needed), shown in SocCbrResource for tenantId |
