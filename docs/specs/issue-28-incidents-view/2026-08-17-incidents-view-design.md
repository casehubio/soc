# Phase 1: Incidents View — Design Spec

**Date:** 2026-08-17
**Issue:** casehubio/soc#28 — Phase 1: Incidents view
**Epic:** casehubio/soc#26 — SOC Incident Response Web Application
**Branch:** issue-28-incidents-view

---

## Overview

Implements the Incidents view — the primary SOC operator screen for monitoring, selecting, and investigating security incidents. Built on the Phase 0 Quinoa skeleton (landed in `a7f7c4b`). Composes existing blocks-ui components (`blocks-case-explorer`, `blocks-timeline`, `blocks-kpi-metric-row`, `blocks-channel-feed`) with three new SOC-specific Lit elements (`soc-attck-matrix`, `soc-ioc-panel`, `soc-alert-heatmap`). Backed by 8 JAX-RS endpoints and SSE push via EventBroadcaster.

---

## Architecture

```
Browser — Incidents View
┌──────────────────────────────────────────────────────────────┐
│  columns([40, 60])                                           │
│  ┌──────────────────────┐  ┌───────────────────────────────┐ │
│  │ LIST PANE             │  │ DETAIL PANE                   │ │
│  │                       │  │                               │ │
│  │ <blocks-case-explorer>│  │ <blocks-timeline>             │ │
│  │   endpoint="/api/soc/ │  │   endpoint="/api/soc/         │ │
│  │   incidents"          │  │   incidents/{id}/timeline"    │ │
│  │   triggerUrl="soc:    │  │                               │ │
│  │   incidents"          │  │ tabs:                         │ │
│  │                       │  │ ┌─────────────────────────┐   │ │
│  │ <blocks-kpi-metric-   │  │ │ Channels │ ATT&CK │ IOC │   │ │
│  │  row>                 │  │ ├─────────────────────────┤   │ │
│  │   endpoint="/api/soc/ │  │ │ <blocks-channel-feed>   │   │ │
│  │   kpis"               │  │ │ <soc-attck-matrix>      │   │ │
│  │                       │  │ │ <soc-ioc-panel>         │   │ │
│  │ <soc-alert-heatmap>   │  │ └─────────────────────────┘   │ │
│  │   endpoint="/api/soc/ │  │                               │ │
│  │   alerts/heatmap"     │  └───────────────────────────────┘ │
│  └──────────────────────┘                                    │
└──────────────────────────────────────────────────────────────┘
                          │ HTTP / SSE
┌─────────────────────────┼────────────────────────────────────┐
│  Quarkus (app/)         │                                     │
│  SocIncidentResource    │  SocIncidentPushService             │
│  SocKpiResource         │    observes CaseLifecycleEvent      │
│  SocAlertResource       │    observes SocIncidentStatusChanged│
│                         │    broadcasts via EventBroadcaster  │
└─────────────────────────┴────────────────────────────────────┘
```

---

## Layout Composition (D2)

The Incidents sidebar tab uses `columns([40, 60])` to split into list and detail panes.

**List pane** (left 40%):
- `blocks-case-explorer` — incident list with live SSE-triggered refresh
- `blocks-kpi-metric-row` — SOC operational KPIs (open incidents, MTTR, FP rate, P1 SLA %)
- `soc-alert-heatmap` — alert volume by source × severity × time

**Detail pane** (right 60%):
- `blocks-timeline` — always visible at top, shows investigation steps for selected incident
- `tabs` below timeline:
  - **Channels** — `blocks-channel-feed` showing worker output (COMMAND/DONE speech acts)
  - **ATT&CK** — `soc-attck-matrix` showing MITRE ATT&CK tactic/technique mapping
  - **IOC** — `soc-ioc-panel` showing extracted IOCs with type, confidence, source

Detail pane components are hidden (empty state) until an incident is selected.

### Cross-Component Communication (D1)

Hybrid URL + pages events:

1. User clicks incident in case-explorer → component emits `pages-event` with topic `incident:selected` and payload `{ caseId }`.
2. A listener updates the URL hash to `#incident={caseId}`.
3. Detail components listen for `incident:selected` events and re-bind their endpoints to the selected ID.
4. On page load, if URL hash contains `#incident={caseId}`, programmatically select that incident in case-explorer and fire the event.

This gives instant in-page reactivity and deep-linking.

---

## TypeScript Module Structure

```
app/src/main/webui/src/
├── index.ts                    # loadSite() entry, sidebar, view composition
├── incidents/
│   ├── incidents-view.ts       # Incidents view composition (columns, data sources, event wiring)
│   ├── incident-selection.ts   # URL ↔ pages-event sync for selected incident
│   └── incident-sources.ts     # restSource/sseSource factory for incident endpoints
├── components/
│   ├── soc-attck-matrix.ts     # MITRE ATT&CK grid (Lit element, DataSourceMixin)
│   ├── soc-ioc-panel.ts        # IOC display (Lit element, DataSourceMixin)
│   └── soc-alert-heatmap.ts    # Alert heatmap (Lit element, DataSourceMixin)
└── types/
    └── soc-types.ts            # Shared TypeScript interfaces matching Java domain
```

### Component Conventions (D3)

All three new components follow blocks-ui conventions for easy promotion:

- Extend `DataSourceMixin(LitElement)` for data binding
- Accept `endpoint` property for data source URL
- Emit `pages-event` for user interactions (e.g., heatmap cell click → filter case-explorer)
- No SOC-specific imports — only Lit, DataSourceMixin, and standard DOM APIs
- Each in its own file with no cross-component dependencies
- Styles scoped via Shadow DOM

---

## New SOC Components

### `<soc-attck-matrix>`

MITRE ATT&CK tactic/technique grid visualisation.

**Properties:**
- `endpoint: string` — URL returning ATT&CK mapping for selected incident

**Data contract (from endpoint):**
```typescript
interface AttckMapping {
  techniques: AttckTechnique[];
}
interface AttckTechnique {
  id: string;        // e.g. "T1566.001"
  name: string;      // e.g. "Spearphishing Attachment"
  tactic: string;    // e.g. "initial-access"
  confidence: number; // 0.0–1.0
  evidence: string;   // supporting evidence text
}
```

**Rendering:** 14 ATT&CK tactic columns, technique cells highlighted with confidence as colour intensity. Click on a technique emits `pages-event` topic `attck:technique:selected`.

**Data flow:** Uses `DataSourceMixin` → `fetchSource` → `createTypedFetchSource` with custom handler to map domain JSON to TypedDataSet. Overrides `createSourceFactory()` following the compliance-summary pattern.

### `<soc-ioc-panel>`

IOC display grouped by type with confidence bars and source attribution.

**Properties:**
- `endpoint: string` — URL returning IOCs for selected incident

**Data contract:**
```typescript
interface IocList {
  iocs: IocEntry[];
}
interface IocEntry {
  type: string;       // IocType enum value
  value: string;
  confidence: number; // 0.0–1.0
  source: string;
  firstSeen: string;  // ISO-8601
  tags: string[];
}
```

**Rendering:** Grouped by IOC type (IP, hash, domain, URL, etc.) with type icons. Confidence as horizontal bar. Source attribution text. External link stubs for future threat feed integration (VirusTotal, MISP).

### `<soc-alert-heatmap>`

Alert volume by source × severity × time.

**Properties:**
- `endpoint: string` — URL returning heatmap data
- `time-unit: string` — `"hour" | "day" | "week"`, default `"day"`

**Data contract:**
```typescript
interface HeatmapData {
  cells: HeatmapCell[];
  sources: string[];
  severities: string[];
}
interface HeatmapCell {
  source: string;
  severity: string;
  time: string;    // ISO-8601
  count: number;
}
```

**Rendering:** Grid with sources as rows, time as columns, colour intensity by count. Severity filterable. Click on cell emits `pages-event` topic `heatmap:cell:selected` with `{ source, severity, time }` for filtering the case-explorer.

---

## REST Endpoints

All in `app/src/main/java/io/casehub/soc/rest/`. Return raw domain JSON per platform convention.

### SocIncidentResource (`/api/soc/incidents`)

| Endpoint | Method | Returns | Notes |
|---|---|---|---|
| `/api/soc/incidents` | GET | `{ entities: [...], totalCount: N }` | Incident list for case-explorer (D4). Entities are incident summary objects. |
| `/api/soc/incidents/{id}` | GET | Incident detail object | Full incident with context snapshot. |
| `/api/soc/incidents/{id}/timeline` | GET | `SocStepType[]` timeline entries | Investigation steps: alert → IOC enrichment → ATT&CK → containment → resolution. |
| `/api/soc/incidents/{id}/channels` | GET | Channel message list | Worker output (COMMAND/DONE speech acts) from Qhorus channels. |
| `/api/soc/incidents/{id}/iocs` | GET | `{ iocs: IocEntry[] }` | Extracted from case context `iocEnrichment`. |
| `/api/soc/incidents/{id}/attck` | GET | `{ techniques: AttckTechnique[] }` | Extracted from case context `attckMapping`. |

### SocKpiResource (`/api/soc/kpis`)

| Endpoint | Method | Returns | Notes |
|---|---|---|---|
| `/api/soc/kpis` | GET | `MetricDefinition[]` | Array of KPI metrics: open incidents, MTTR, FP rate, P1 SLA %. Each has `label`, `value`, `unit`, `trend`. |

### SocAlertResource (`/api/soc/alerts`)

| Endpoint | Method | Returns | Notes |
|---|---|---|---|
| `/api/soc/alerts/heatmap` | GET | `HeatmapData` | Alert volume by source × severity × time. Query params: `timeUnit`, `from`, `to`. |

### Implementation Notes

- **Incident list** queries `CaseInstanceRepository` filtered by `SocCaseTypes.INCIDENT_INVESTIGATION`. Maps `CaseInstance` to an incident summary DTO with fields matching case-explorer entity format.
- **Timeline** queries `PlanItem` history for the case, ordered chronologically.
- **Channels** delegates to Qhorus channel API, filtered by case ID.
- **IOCs** reads from case context key `iocEnrichment` (populated by `IocExtractor` / `RuleIocEnrichmentWorker`).
- **ATT&CK** reads from case context key `attckMapping` (populated by `RuleAttckMappingWorker`).
- **KPIs** are aggregated from `CaseInstanceRepository`: count by status, avg resolution time, false positive rate (resolved as `FALSE_POSITIVE`), P1 SLA compliance from `SocSlaBreachPolicy`.

---

## SSE Push

### Connection Endpoint

`GET /api/soc/events` — single SSE endpoint for all SOC topics. Uses `EventBroadcaster` from `casehub-pages-push-runtime`.

### Topics (colon-separated per platform convention)

| Topic | Events | Trigger |
|---|---|---|
| `soc:incidents` | append (new), replace (status change) | `CaseLifecycleEvent` / `SocIncidentStatusChangedEvent` |
| `soc:channels:{caseId}` | append (new message) | Qhorus channel observer |
| `soc:kpis` | snapshot (full refresh) | On incident state change |

### Client Integration

**List views** (case-explorer, kpi-metric-row): use `restSource` with `triggerUrl` pointing to the SSE topic. When a push event arrives, the source auto-re-fetches from the REST endpoint. Simple, correct, minimal code.

**Detail views** (timeline, channels): use `EventStreamController` for granular push operations (append new entries without re-fetching the full dataset). More efficient for append-heavy streams like channel messages.

### SocIncidentPushService

```java
@ApplicationScoped
public class SocIncidentPushService {

    @Inject EventBroadcaster broadcaster;

    public void onIncidentCreated(@ObservesAsync CaseLifecycleEvent event) {
        // filter for CaseStarted + SOC case type
        // broadcast("soc:incidents", PushMessage.append(...))
    }

    public void onStatusChanged(@ObservesAsync SocIncidentStatusChangedEvent event) {
        // broadcast("soc:incidents", PushMessage.replace(...))
        // broadcast("soc:kpis", PushMessage.snapshot(...))
    }
}
```

### JsonWriter Override (GE-20260813-b4e2d8)

The default `JsonWriter` from `PushProducers` uses vanilla `ObjectMapper` without JSR310 support. SOC events contain `Instant` fields (createdAt, occurredAt). Override:

```java
@ApplicationScoped
public class SocJsonWriterProducer {
    @Produces @ApplicationScoped
    JsonWriter jsonWriter() {
        var mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper::writeValueAsString;
    }
}
```

---

## Index.ts Changes

Replace the Incidents placeholder with the composed view. Apply the first-tab navigation fix (GE-20260814-0d4123):

```typescript
const app = page("SOC — Incident Response",
  sidebar(
    ["Incidents", incidentsView()],     // composed view from incidents/incidents-view.ts
    ["Workbench", placeholder(...)],
    ["Trust", placeholder(...)],
    ["Compliance", placeholder(...)],
  )
);

const container = document.getElementById("app");
if (container) {
  const site = await loadSite(container, app);
  if (!location.hash) {
    site.navigate("Incidents");  // fix: first tab data binding (GE-20260814-0d4123)
  }
}
```

---

## Package Dependencies

Add to `app/src/main/webui/package.json`:

```json
{
  "dependencies": {
    "@casehubio/pages-runtime": "file:../../../../../pages/packages/pages-runtime",
    "@casehubio/pages-ui": "file:../../../../../pages/packages/pages-ui",
    "@casehubio/pages-data": "file:../../../../../pages/packages/pages-data",
    "@casehubio/blocks-ui-core": "file:../../../../../blocks-ui/packages/blocks-ui-core",
    "@nicegui/blocks-case-explorer": "file:../../../../../blocks-ui/components/case-explorer",
    "@nicegui/blocks-timeline": "file:../../../../../blocks-ui/components/blocks-timeline",
    "@nicegui/blocks-kpi-metric-row": "file:../../../../../blocks-ui/components/kpi-metric-row",
    "@nicegui/blocks-channel-feed": "file:../../../../../blocks-ui/components/channel-feed"
  }
}
```

Component package names to be verified against blocks-ui's actual package.json names at implementation time.

---

## Maven Dependencies

Add to `app/pom.xml`:

```xml
<dependency>
    <groupId>io.casehub</groupId>
    <artifactId>casehub-pages-push-runtime</artifactId>
</dependency>
```

The `pages-push-runtime` module provides `EventBroadcaster`, `PushMessage`, `TopicRegistry`, and the CDI producers. Version managed by parent BOM.

---

## Testing Strategy

### Java Integration Tests

- **SocIncidentResourceTest** — verify each endpoint returns correct JSON shape. Use `@QuarkusTest` with test data seeded via `SocCaseHub`.
- **SocIncidentPushServiceTest** — verify push events fire on case lifecycle events. Mock `EventBroadcaster`, assert correct topics and message format.
- **SocKpiResourceTest** — verify KPI aggregation logic with known test incidents.

### TypeScript Unit Tests

- **soc-attck-matrix** — renders technique grid from mock data, emits click events
- **soc-ioc-panel** — renders grouped IOCs, confidence bars, type icons
- **soc-alert-heatmap** — renders grid cells, colour intensity, click events
- **incident-selection** — URL ↔ event sync: setting hash fires event, receiving event updates hash

### Manual Verification

- Run `mvn quarkus:dev`, open browser, verify:
  - Incidents view loads with case-explorer showing test incidents
  - Selecting an incident updates timeline and detail tabs
  - KPI metrics display
  - Alert heatmap renders
  - URL updates on incident selection; pasting URL selects correct incident

---

## Files Changed

### New Java Files

| File | Purpose |
|---|---|
| `app/src/main/java/io/casehub/soc/rest/SocIncidentResource.java` | Incident CRUD + timeline/channels/IOC/ATT&CK endpoints |
| `app/src/main/java/io/casehub/soc/rest/SocKpiResource.java` | KPI metrics endpoint |
| `app/src/main/java/io/casehub/soc/rest/SocAlertResource.java` | Alert heatmap endpoint |
| `app/src/main/java/io/casehub/soc/rest/SocIncidentPushService.java` | SSE push on incident lifecycle events |
| `app/src/main/java/io/casehub/soc/rest/SocJsonWriterProducer.java` | Custom JsonWriter with JavaTimeModule |
| `app/src/main/java/io/casehub/soc/rest/dto/IncidentSummaryDto.java` | Incident list DTO for case-explorer entity format |

### New TypeScript Files

| File | Purpose |
|---|---|
| `app/src/main/webui/src/incidents/incidents-view.ts` | View composition |
| `app/src/main/webui/src/incidents/incident-selection.ts` | URL ↔ event sync |
| `app/src/main/webui/src/incidents/incident-sources.ts` | Data source factories |
| `app/src/main/webui/src/components/soc-attck-matrix.ts` | ATT&CK matrix component |
| `app/src/main/webui/src/components/soc-ioc-panel.ts` | IOC panel component |
| `app/src/main/webui/src/components/soc-alert-heatmap.ts` | Alert heatmap component |
| `app/src/main/webui/src/types/soc-types.ts` | Shared TypeScript interfaces |

### Modified Files

| File | Change |
|---|---|
| `app/src/main/webui/src/index.ts` | Replace Incidents placeholder with composed view; add first-tab navigate fix |
| `app/src/main/webui/package.json` | Add blocks-ui and pages-data dependencies |
| `app/pom.xml` | Add pages-push-runtime dependency |

---

## Design Constraints (from garden entries)

| Constraint | Source | Impact |
|---|---|---|
| `restSource` needs `dataPath: "items"` for paginated responses | GE-20260814-37b0ed | Incident list endpoint uses `{ entities: [...] }` shape; client configures `dataPath` |
| First tab needs explicit `site.navigate()` after `loadSite()` | GE-20260814-0d4123 | Added to index.ts |
| `EventBroadcaster` Instant serialization fails without JavaTimeModule | GE-20260813-b4e2d8 | Custom JsonWriter producer |
| Topic registry uses colon separator | GE-20260813-topic-registry-colon-separator | Topics: `soc:incidents`, `soc:channels:{caseId}`, `soc:kpis` |
| Composable reactive controllers for shared state | GE-20260816-e89cda | Applicable if multiple views share push connections; defer to Phase 2+ |

---

## References

- [docs/specs/issue-26-soc-web-app/2026-08-14-soc-web-app-design.md] — Epic design spec (Phase 1 section)
- [docs/specs/issue-26-soc-web-app/decisions.md] — Epic decisions D1–D5
- [GE-20260816-e89cda] — Composable Lit reactive controllers
- [GE-20260814-37b0ed] — Pages restSource dataPath for paginated responses
- [GE-20260814-0d4123] — First tab no-data fix
- [GE-20260813-b4e2d8] — EventBroadcaster Instant serialization
- [GE-20260813-topic-registry-colon-separator] — Topic registry colon separator
- [app/src/main/java/io/casehub/soc/rest/SocComplianceResource.java] — Existing REST resource pattern
- [app/src/main/java/io/casehub/soc/domain/] — SOC domain model
- [pages/packages/pages-ui/src/dsl/builders.ts] — Pages DSL layout primitives
- [pages/packages/pages-data/src/datasource/sources/rest-source.ts] — restSource with triggerUrl
- [blocks-ui/components/case-explorer/src/entity-list.ts] — Entity list response reader convention
