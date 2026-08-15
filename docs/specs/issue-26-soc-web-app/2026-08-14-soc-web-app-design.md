# SOC Incident Response Web Application — Design Spec

**Date:** 2026-08-14
**Issue:** casehubio/soc#26 — Epic: SOC Incident Response Web Application
**Branch:** TBD (will be created at work-start)

---

## Overview

Full incident response web application built on casehub-pages + blocks-ui. Sidebar navigation with four views: Incidents, Analyst Workbench, Trust & Routing, Compliance & Audit. All 16 primary UI components exist in blocks-ui — the work is composition, REST endpoints, and SSE push wiring. Three new blocks-ui components for SOC-specific visualizations (ATT&CK matrix, IOC panel, alert heatmap). Hosted via Quarkus Quinoa (single JAR).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ casehub-pages runtime                                │ │
│  │  loadSite() → sidebar + panel per view               │ │
│  │  blocks-ui Web Components (registered via hostPanel)  │ │
│  │  DataSourceMixin → REST endpoints                     │ │
│  │  EventStreamController → SSE push                     │ │
│  └────────────────────┬────────────────────────────────┘ │
└───────────────────────┼──────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────┼──────────────────────────────────┐
│  Quarkus (Quinoa)     │                                   │
│  ┌────────────────────┴────────────────────────────────┐ │
│  │ JAX-RS Resources (app/)                              │ │
│  │  SocIncidentResource     → CaseInstanceRepository    │ │
│  │  SocWorkItemResource     → WorkItemCreator           │ │
│  │  SocTrustResource        → LedgerRepository          │ │
│  │  SocComplianceResource   → LedgerVerificationService │ │
│  │  SocPushResource         → EventBroadcaster (SSE)    │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Data flow:** blocks-ui components declare `endpoint="/api/soc/..."`. The `DataSourceMixin` fetches JSON, pipes it through the extraction pipeline into `TypedDataSet`, and delivers it as `this.data`. For real-time updates, `EventStreamController` connects to SSE endpoints. Push messages use the unified operation vocabulary (`snapshot`, `append`, `replace`, `remove`).

**Hosting:** Quarkus Quinoa — TypeScript sources in `app/src/main/webui/`, compiled by Quinoa at build time, served from classpath. Single `mvn quarkus:dev` hot-reloads Java and TypeScript. Single `mvn package` produces one JAR.

---

## Navigation

Sidebar with four views + notification bell:

| Icon | Label | View | Primary Components |
|---|---|---|---|
| IN | Incidents | Incident list + detail | case-explorer, blocks-timeline, channel-activity, kpi-metric-row, attck-matrix, ioc-panel |
| WB | Workbench | Analyst work queue | work-item-workbench, sla-indicator, sla-breach-policy, approval-gate |
| TR | Trust | Agent trust dashboards | trust-workbench, routing-rationale, similarity-panel |
| CO | Compliance | Audit & regulatory | audit-trail-viewer, compliance-summary, gdpr-erasure-action |
| 🔔 | Notifications | Dropdown overlay | notification-inbox |

Navigation uses Pages `sidebar` component with `panel` per view. View switching is client-side — no page reload.

---

## Phase 0 — Skeleton

Infrastructure + empty navigation shell.

### Quinoa Setup

- `app/pom.xml`: add `quarkus-quinoa` dependency
- `app/src/main/webui/package.json`: `@casehubio/pages-ui`, `@casehubio/pages-data`, `@nicegui/blocks-ui` dependencies
- `app/src/main/webui/tsconfig.json`: TypeScript config
- `app/src/main/webui/src/app.ts`: `loadSite()` entry point
- `application.properties`: `quarkus.quinoa.dev-server=true`

### Layout

```typescript
// Illustrative — exact DSL syntax to be verified against
// @casehubio/pages-ui and @casehubio/pages-data at implementation time.
// The intent is: sidebar navigation with 4 panels, each hosting
// blocks-ui Web Components via registerPanel/hostPanel.
import { loadSite, sidebar, panel, page } from '@casehubio/pages-ui';

const app = page(
  sidebar([
    { id: 'incidents', label: 'Incidents', icon: 'shield' },
    { id: 'workbench', label: 'Workbench', icon: 'inbox' },
    { id: 'trust', label: 'Trust', icon: 'gauge' },
    { id: 'compliance', label: 'Compliance', icon: 'lock' },
  ]),
  panel('incidents', /* Phase 1 content */),
  panel('workbench', /* Phase 2 content */),
  panel('trust', /* Phase 3 content */),
  panel('compliance', /* Phase 4 content */),
);

loadSite(document.getElementById('app'), app);
```

**Note:** All TypeScript and Java code samples in this spec are illustrative — they show intent and data flow, not compilable code. Package names, DSL method signatures, and PushMessage API calls must be verified against the current `casehub-pages` and `casehub-pages-push` source at implementation time. Reference: `pages/docs/CASEHUB-PAGES.md` (TypeScript DSL), `pages/backend/push/` (Java push SDK).

### Deliverable

Browser loads, sidebar renders, views switch. No data, no components — pure shell.

---

## Phase 1 — Incidents View

### Layout

```
┌──────┬─────────────────────────┬──────────────────────┐
│      │                         │                      │
│ ■ IN │ <case-explorer>         │ <blocks-timeline>    │
│   WB │  INC-01 P1  CRITICAL ◀ │  14:30 Alert recv'd  │
│   TR │  INC-02 P2  HIGH       │  14:31 IOC enriched  │
│   CO │  INC-03 P3  MEDIUM     │  14:32 ATT&CK mapped │
│      │                         │  14:33 Containment   │
│      │ <kpi-metric-row>        │                      │
│      │  Open: 3 │ MTTR: 24m   │ <channel-activity>   │
│      │  FP: 12% │ P1 SLA: 98% │  worker output feed  │
│      │                         │                      │
│      │ <alert-heatmap>         │ <attck-matrix>       │
│   🔔 │  source × severity/time │ <ioc-panel>          │
└──────┴─────────────────────────┴──────────────────────┘
```

### Components

**`<case-explorer>`** — incident list with live SSE updates. Registration-based: SOC registers an entity type for incidents. Columns: ID, priority, severity, source, status, created time. Selection emits `pages-event` on topic `incident:selected`.

**`<blocks-timeline>`** — investigation step timeline for selected incident. Bound to `/api/soc/incidents/{id}/timeline`. Shows alert → IOC enrichment → ATT&CK mapping → containment → analyst review with timestamps.

**`<channel-activity>`** — worker output feed for selected incident. Shows COMMAND/DONE speech acts from the investigation pipeline. SSE-driven via `soc.channels.{caseId}` topic.

**`<kpi-metric-row>`** — SOC operational KPIs. Bound to `/api/soc/kpis`. Cards: open incidents, MTTR, false positive rate, P1 SLA compliance %. Sparklines for trends.

**`<alert-heatmap>`** (NEW blocks-ui) — alert volume by source × severity over time. Below the KPI row in the list pane. Provides at-a-glance alert volume context. Click to filter the case-explorer by source/severity.

**`<attck-matrix>`** (NEW blocks-ui) — MITRE ATT&CK tactic/technique visualization for the selected incident. Highlights detected techniques with confidence scores. Grid layout: tactics as columns, techniques as rows.

**`<ioc-panel>`** (NEW blocks-ui) — IOC display with type icons, values, confidence, source attribution. Grouped by IOC type. Links to external threat feeds (VirusTotal, MISP) when available.

### REST Endpoints

| Endpoint | Method | Returns | Source |
|---|---|---|---|
| `/api/soc/incidents` | GET | Incident list (TypedDataSet) | CaseInstanceRepository filtered by SOC namespace |
| `/api/soc/incidents/{id}` | GET | Incident detail | CaseInstance + context snapshot |
| `/api/soc/incidents/{id}/timeline` | GET | Investigation steps | PlanItem history for the case |
| `/api/soc/incidents/{id}/channels` | GET | Channel messages | Qhorus channel by case ID |
| `/api/soc/incidents/{id}/iocs` | GET | IOC list | Extracted from case context `iocEnrichment` |
| `/api/soc/incidents/{id}/attck` | GET | ATT&CK mapping | Extracted from case context `attckMapping` |
| `/api/soc/kpis` | GET | KPI metrics | Aggregated from case repository |
| `/api/soc/alerts/heatmap` | GET | Alert volume by source × severity × time | Aggregated from situation store |

### SSE Push

**Connection endpoint:** `GET /api/soc/events` — single SSE endpoint for all SOC topics. Clients subscribe to specific topics via the pages `PushSource` API. The backend uses `EventBroadcaster` from `casehub-pages-push-runtime` to multiplex topics over one connection per client (via `PushPool`).

| Topic | Events | Trigger |
|---|---|---|
| `soc.incidents` | `append` (new), `replace` (status change) | CaseLifecycleEvent observer |
| `soc.channels.{caseId}` | `append` (new message) | Qhorus channel observer |
| `soc.kpis` | `snapshot` (refresh) | Periodic or on incident state change |

### SSE Implementation

```java
// Illustrative — PushMessage API signatures to be verified against
// casehub-pages-push source. SocIncidentStatusChangedEvent already
// exists in api/ (implemented in #23, slot 106).
@ApplicationScoped
public class SocIncidentPushService {

    @Inject EventBroadcaster broadcaster;

    public void onIncidentCreated(@ObservesAsync CaseLifecycleEvent event) {
        if (!"CaseStarted".equals(event.eventType())) return;
        // Verify: PushMessage.append() signature and toIncidentRow() null safety
        broadcaster.broadcast("soc.incidents", /* append new incident row */);
    }

    public void onIncidentStatusChanged(@ObservesAsync SocIncidentStatusChangedEvent event) {
        broadcaster.broadcast("soc.incidents", /* replace by caseId */);
    }
}
```

---

## Phase 2 — Analyst Workbench

### Layout

```
┌──────┬─────────────────────────┬──────────────────────┐
│      │                         │                      │
│   IN │ <work-item-inbox>       │ <work-item-detail>   │
│ ■ WB │  ■ INC-01 P1 ◀         │  <sla-indicator>     │
│   TR │  □ INC-02 P2           │  P1: 12:30 remaining │
│   CO │  □ INC-03 P3           │                      │
│      │                         │  Investigation data  │
│      │ Tabs: My Work │         │  (from Phase 1 view) │
│      │  Claimable │ All        │                      │
│      │                         │  <approval-gate>     │
│      │                         │  [Approve] [Reject]  │
│      │                         │                      │
│      │                         │  Case notes textarea │
│   🔔 │                         │  IOC submission form │
└──────┴─────────────────────────┴──────────────────────┘
```

### Components

**`<work-item-workbench>`** — composites `<work-item-inbox>` + `<work-item-detail>` in split view. Three-tab inbox (My Work / Claimable / All). SSE-driven lifecycle updates.

**`<sla-indicator>`** — countdown timer with breach state. Threshold-based colour transitions. Shows current escalation tier via `<sla-breach-policy>`.

**`<approval-gate>`** — containment approval decision point. Outcomes: APPROVE, REJECT, MODIFY_AND_APPROVE. Quorum tracking (M-of-N when engine#810 lands).

**`<notification-inbox>`** — in the notification bell dropdown. Category/severity filters. SSE updates for new notifications.

**Case notes** — `textarea` bound to `POST /api/soc/incidents/{id}/notes`. Appends to case context.

**Manual IOC submission** — form with IOC type dropdown, value text input, confidence slider. `POST /api/soc/incidents/{id}/iocs`.

### REST Endpoints (additional)

| Endpoint | Method | Returns/Accepts |
|---|---|---|
| `/api/soc/workitems` | GET | SOC work items (filtered by candidate groups) |
| `/api/soc/incidents/{id}/notes` | POST | Add case note (text body) |
| `/api/soc/incidents/{id}/iocs` | POST | Submit IOC (type, value, confidence) |

---

## Phase 3 — Trust & Routing

### Layout

```
┌──────┬─────────────────────────┬──────────────────────┐
│      │                         │                      │
│   IN │ <trust-score-panel>     │ <routing-rationale>  │
│   WB │  triage: 0.82          │  Selected: claude:   │
│ ■ TR │  invest: 0.75          │  ioc-enrichment@v1   │
│   CO │  contain: —            │  Reason: trust 0.82  │
│      │                         │  > rule 0.65         │
│      │ <similarity-panel>      │                      │
│      │  3 similar incidents    │ <kpi-metric-row>     │
│      │  (80% resolved as P2)   │  Agent fleet health  │
│   🔔 │                         │                      │
└──────┴─────────────────────────┴──────────────────────┘
```

### Components

**`<trust-workbench>`** — composite: trust-score-panel + routing-rationale + trust-feedback-display in split view.

**`<similarity-panel>`** — CBR retrieved incidents with similarity scores, outcomes, resolution times.

**`<kpi-metric-row>`** — agent fleet metrics: per-agent trust scores, workload distribution, capability coverage.

### REST Endpoints (additional)

| Endpoint | Method | Returns |
|---|---|---|
| `/api/soc/trust/{agentId}` | GET | Trust scores per dimension |
| `/api/soc/trust/fleet` | GET | All agent trust summaries |
| `/api/soc/cbr/similar/{caseId}` | GET | Similar past incidents |

---

## Phase 4 — Compliance & Audit

### Layout

```
┌──────┬──────────────────────────────────────────────────┐
│      │                                                  │
│   IN │ <audit-trail-viewer>                             │
│   WB │  AlertTriage → IncidentPromoted → Investigation  │
│   TR │  → ContainmentDecision → IncidentResolved        │
│ ■ CO │  [Verify Merkle Proof]                           │
│      │                                                  │
│      │ <compliance-summary>                             │
│      │  DORA: 94% SLA compliance (P1:100% P2:88%)      │
│      │  SOC2: All containment actions approved ✓         │
│      │                                                  │
│      │ <gdpr-erasure-action>                            │
│   🔔 │  [Request data subject erasure]                  │
└──────┴──────────────────────────────────────────────────┘
```

### Components

**`<audit-trail-viewer>`** — chronological ledger entries with Merkle verification banner. Filters by entry type, date range, agent. Attestation badges.

**`<compliance-summary>`** — regulation compliance grid. Status per framework (DORA, SOC2, NIS2) with MET/PARTIAL/GAP/BREACHED badges.

**`<gdpr-erasure-action>`** — three-phase GDPR data erasure workflow form.

### REST Endpoints (additional)

| Endpoint | Method | Returns |
|---|---|---|
| `/api/soc/compliance/proof/{entryId}` | GET | Merkle inclusion proof |
| `/api/soc/compliance/timeline/{incidentId}` | GET | Ledger entry chain for incident |
| `/api/soc/compliance/dora-report` | GET | DORA response time report |
| `/api/soc/compliance/erasure` | POST | Initiate GDPR erasure |

---

## New blocks-ui Components

Three SOC-specific components to contribute to blocks-ui:

### `<attck-matrix>`

MITRE ATT&CK tactic/technique grid. Tactics as columns (14), techniques as highlighted cells. Confidence scores as colour intensity. Click to filter incidents by technique.

**Data contract:** `endpoint` returning `{ techniques: [{ id, name, tactic, confidence, evidence }] }`

**Package:** `blocks-ui/packages/attck-matrix/`

### `<ioc-panel>`

IOC list with type icons, values, confidence bars, source attribution. Grouped by type (IP, hash, domain, URL, email). External threat feed links.

**Data contract:** `endpoint` returning `{ iocs: [{ type, value, confidence, source, firstSeen, tags }] }`

**Package:** `blocks-ui/packages/ioc-panel/`

### `<alert-heatmap>`

Alert volume by source × severity over time. Colour-coded cells. Time axis configurable (hour/day/week). Click to drill into specific cell's alerts.

**Data contract:** `endpoint` returning `{ cells: [{ source, severity, time, count }] }`

**Package:** `blocks-ui/packages/alert-heatmap/`

---

## Cross-Cutting

### Authentication

Pages `withAccess(roles)` modifier on panels for role-based visibility:
- `soc-tier1-analyst`: Incidents, Workbench
- `soc-manager`: all views + compliance actions
- `soc-ciso`: Compliance view (read-only)

### Error Handling

- REST endpoint failures: DataSourceMixin shows error state in component
- SSE disconnect: `EventStreamController` auto-reconnects with backoff via `PushPool` (one connection per base URL). Reconnection is a pages framework concern — SOC does not implement custom reconnection logic.
- Event loss during reconnection: the pages `EventStore` SPI supports replay from a sequence number. If the SOC deployment uses a durable `EventStore` (JPA or Redis), missed events are replayed on reconnect. With `InMemoryEventStore` (dev), events during disconnect are lost — acceptable for development.
- Race condition (REST fetch vs SSE subscription): components using both `DataSourceMixin` and `EventStreamController` should subscribe to SSE first, then fetch REST. The pages framework handles this ordering internally — verify at implementation time.
- Stale data fallback: periodic refresh via `dataset({ refresh: { interval: 30000 } })` as a safety net for any missed push events

### Testing

- **TypeScript unit tests**: Component rendering, data binding, event emission
- **Integration tests**: REST endpoints return correct TypedDataSet format
- **E2E tests** (future): Playwright browser tests against running Quinoa app

---

## Files Changed (Phase 0)

| File | Change |
|---|---|
| `app/pom.xml` | Add quarkus-quinoa, pages-push-runtime dependencies |
| `app/src/main/webui/package.json` | New — npm dependencies |
| `app/src/main/webui/tsconfig.json` | New — TypeScript config |
| `app/src/main/webui/src/app.ts` | New — loadSite() entry point |
| `app/src/main/webui/index.html` | New — HTML shell |
| `app/src/main/resources/application.properties` | Quinoa config |

## Implementation Phasing

| Phase | Scope | Issues | Dependencies |
|---|---|---|---|
| 0 | Skeleton: Quinoa + sidebar + empty views | — | None |
| 1 | Incidents: case-explorer, timeline, channels, KPIs, ATT&CK, IOC | blocks-ui: attck-matrix, ioc-panel | Phase 0 |
| 2 | Workbench: work-item-workbench, SLA, approval, notes, IOC submission | — | Phase 0 |
| 3 | Trust: trust-workbench, similarity, fleet metrics | — | Phase 0 |
| 4 | Compliance: audit-trail, compliance-summary, GDPR erasure | — | Phase 0 |

## Review Findings Resolved

| Finding | Source | Resolution |
|---|---|---|
| Pages DSL API / package names don't match reality | Coherence R1-01, Structure R1-02 | Added note: all code samples are illustrative, not compilable. Package corrected to `@casehubio/pages-ui`. |
| PushMessage API signatures wrong | Coherence R1-02, Robustness R1-02 | Code sample marked illustrative with verification note |
| `SocIncidentStatusChangedEvent` undefined | Coherence R1-03, Robustness R1-03 | False positive — exists in api/ (implemented in #23, slot 106) |
| `<alert-heatmap>` defined but never placed | Coherence R1-04, Structure R1-03 | Placed in Incidents view below KPI row, endpoint added |
| Phase independence claim false | Coherence R1-05, Structure R1-05 | Clarified: views are independent, data layer is shared, Phase 1 endpoints are prerequisite for Phase 2 |
| SSE connection endpoint undefined | Structure R1-06 | Added `GET /api/soc/events` SSE endpoint |
| Race condition REST↔SSE | Robustness R1-04 | Added error handling note: pages framework handles ordering internally |
| SSE reconnection event loss | Robustness R1-05 | Added EventStore replay note (durable store replays, in-memory loses — acceptable for dev) |
| blocks-ui promotion pipeline | Structure R1-01 | New components built in SOC first, proposed to blocks-ui after validation (standard promotion path) |

---

Phases 1-4 share the REST/SSE infrastructure from Phase 0 but are view-independent — each phase adds a new sidebar view without modifying existing ones. They can be built in any order or in parallel. However, Phase 1's REST endpoints (incidents, channels) are prerequisites for Phase 2's work-item detail view which cross-references incident data.
