# Phase 4: Compliance & Audit Views — Design Spec

**Date:** 2026-08-23
**Issue:** casehubio/soc#31 — Phase 4: Compliance & audit views
**Branch:** issue-31-compliance-audit-views
**Parent:** casehubio/soc#26 — Epic: SOC Incident Response Web Application
**Review:** Light decision review (20 findings, all addressed) + Light spec review (17 findings: 3 HIGH, 5 MEDIUM, 9 LOW — all addressed below)

---

## Overview

Adds the Compliance tab — the last sidebar view in the SOC web application. Three components stacked vertically: an audit trail browser for cross-incident ledger entry inspection with Merkle proof verification, a compliance summary grid showing DORA/SOC2/NIS2 status badges, and a GDPR data erasure action form.

Two of three components are existing blocks-ui components (`blocks-compliance-summary`, `blocks-gdpr-erasure-action`) used directly. The audit trail browser is a SOC-specific component built on `pages-table` and pages primitives because `blocks-audit-trail-viewer` hardcodes the platform ledger URL pattern (`/api/v1/ledger/entries`) and requires a single `subjectId` — incompatible with cross-incident SOC browsing.

The compliance backend is fully implemented (issue-21): `SocComplianceResource`, `SocComplianceService`, `SocLedgerEntry`, `SocLedgerEntryRepository`, `SocPiiSanitiser`, `DoraResponseTimeReport`. This phase adds three new REST endpoints (entries browse, compliance summary, erasure) and the TypeScript view layer.

**Scope:** Compliance view (TypeScript), 3 new REST endpoints (Java), wiring into `index.ts`. No changes to existing views. No platform changes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser — Compliance Tab                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ <soc-audit-trail>          (SOC component)            │ │
│  │   pages-table + renderPropertyTree                    │ │
│  │   filter: date range, step type, actor, incident      │ │
│  │   Merkle proof verification per entry                 │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ <blocks-compliance-summary> (blocks-ui)               │ │
│  │   endpoint="/api/soc/compliance/summary"               │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ <blocks-gdpr-erasure-action> (blocks-ui)              │ │
│  │   endpoint="/api/soc/compliance/erasure"               │ │
│  │   subject-label="Actor"                                │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
          │ HTTP
┌─────────┼────────────────────────────────────────────────┐
│  Quarkus│(Quinoa)                                         │
│  ┌──────┴───────────────────────────────────────────────┐ │
│  │ SocComplianceResource (app/)                          │ │
│  │  GET  /entries        → SocComplianceService          │ │
│  │  GET  /summary        → SocComplianceService          │ │
│  │  POST /erasure        → LedgerErasureService          │ │
│  │  (existing: /proof, /timeline, /dora)                 │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Layout

```
┌──────┬──────────────────────────────────────────────────┐
│      │                                                  │
│   IN │ <soc-audit-trail>                                │
│   WB │  Filter: [Date ▾] [Step Type ▾] [Actor ▾]       │
│   TR │  ┌─────────┬────────┬──────────┬───────────────┐ │
│ ■ CO │  │ Time    │ Actor  │ StepType │ Incident      │ │
│      │  │ 14:30   │ rule:… │ TRIAGE   │ INC-01  [🔍]  │ │
│      │  │ 14:31   │ llm:…  │ INVEST   │ INC-01  [🔍]  │ │
│      │  │ 15:02   │ soc:…  │ CONTAIN  │ INC-02  [🔍]  │ │
│      │  └─────────┴────────┴──────────┴───────────────┘ │
│      │                                                  │
│      │ <blocks-compliance-summary>                      │
│      │  ┌────────┬────────────────┬──────────┬───────┐  │
│      │  │ Reg.   │ Requirement    │ Status   │ Evid. │  │
│      │  │ DORA   │ P1 SLA ≤15m   │ [MET]    │ View  │  │
│      │  │ SOC2   │ Approval gate  │ [MET]    │ View  │  │
│      │  │ NIS2   │ Triage ≤30m   │ [PARTIAL]│ View  │  │
│      │  └────────┴────────────────┴──────────┴───────┘  │
│      │                                                  │
│      │ <blocks-gdpr-erasure-action>                     │
│   🔔 │  [Actor ID ____] [Reason ▾] [Confirm Erasure]   │
└──────┴──────────────────────────────────────────────────┘
```

---

## Component 1: `<soc-audit-trail>` (SOC-specific, using pages primitives)

SOC-specific Lit web component in `app/src/main/webui/src/compliance/soc-audit-trail.ts`. Built on `pages-table` and `renderPropertyTree` from `@casehubio/pages-ui-components` — the same primitives `blocks-audit-trail-viewer` uses internally.

### Why not `blocks-audit-trail-viewer`

The platform component hardcodes `${endpoint}/api/v1/ledger/entries` in URL construction (line 156) and guards on `subjectId` presence (line 149). SOC needs cross-incident browsing at `/api/soc/compliance/entries` with optional filters. No extension point exists for URL customisation — `_updateEndpoints()` is private.

**Platform follow-up:** File a parent issue proposing configurable URL patterns and optional `subjectId` in `blocks-audit-trail-viewer`. Other apps (AML cross-investigation, Clinical cross-trial) will hit the same limitation.

### Data source

`GET /api/soc/compliance/entries` with optional query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `from` | Instant | 30 days ago | Start of date range |
| `to` | Instant | now | End of date range |
| `stepType` | SocStepType | (all) | Filter by step type |
| `actorId` | String | (all) | Filter by actor |
| `incidentId` | UUID | (all) | Filter by incident |
| `page` | int | 0 | Page number (0-indexed) |
| `size` | int | 50 | Page size (max 200) |

Returns a paginated response:

```json
{
  "content": [ /* SocAuditEntry[] */ ],
  "totalElements": 342,
  "totalPages": 7,
  "page": 0,
  "size": 50
}
```

The `soc-audit-trail` component configures `pages-table` with server-side pagination: on page-change events, re-fetches with updated `page` parameter. Total row count from `totalElements` drives the pagination control.

### SocAuditEntry (REST response DTO)

```java
public record SocAuditEntry(
    UUID id,
    UUID incidentId,
    SocStepType stepType,
    int sequenceNumber,
    String actorId,    // sanitised — may be null if redacted
    String actorType,
    String actorRole,
    Instant occurredAt,
    String metadata,   // PII-sanitised JSON
    UUID causedByEntryId) {}
```

**PII sanitisation is mandatory.** The cross-incident endpoint applies `SocPiiSanitiser` to every entry's metadata before returning — same pattern as the existing `incidentTimeline()` method. No unsanitised `SocLedgerEntry` data reaches the REST layer.

### Table columns

| Column | Sortable | Renderer |
|---|---|---|
| Timestamp | yes | `occurredAt` formatted as locale time |
| Actor | yes | `actorId` with `actorType` badge, "Redacted" for null |
| Step Type | yes | `stepType` as coloured badge (triage=blue, containment=amber, resolved=green) |
| Incident | yes | `incidentId` short form with clickable link to Incidents view |
| Seq | no | `sequenceNumber` |

### Merkle proof verification

Each row has a "Verify" action (🔍 icon button) that calls `GET /api/soc/compliance/proof/{entryId}` (existing endpoint). Result renders inline below the row:
- Verified: green banner with tree root hash
- Failed: red banner with error message

Uses the existing `SocComplianceResource.getProof()` endpoint — no new backend work.

### Filter controls

Date range (from/to date inputs), step type chips (ALERT_TRIAGE, INCIDENT_PROMOTED, INVESTIGATION_STEP, CONTAINMENT_DECISION, CONTAINMENT_EXECUTED, INCIDENT_RESOLVED), actor dropdown (populated from `GET /api/soc/compliance/entries/actors?from=...&to=...` — a server-side distinct actor query matching the current date range, not limited to the current page), incident ID text input.

All filters are server-side — filter changes reset pagination to page 0 and trigger a new server fetch. Client-side filtering is incorrect for paginated data (would only filter the current page, missing entries on other pages).

### Expandable row detail

Clicking a row expands to show full metadata (via `renderPropertyTree`), `causedByEntryId` chain link, and the Merkle verification result if already fetched.

---

## Component 2: `<blocks-compliance-summary>` (blocks-ui, used directly)

Tag: `<blocks-compliance-summary endpoint="/api/soc/compliance/summary">`

The component renders a `pages-table` with columns: Regulation, Requirement, Mechanism, Status (badge), Evidence (link). It takes `RequirementDefinition[]` via endpoint or `requirements` property.

### REST endpoint

`GET /api/soc/compliance/summary` — returns `RequirementDefinition[]`.

### Compliance checks and thresholds

Requirements are hardcoded in `SocComplianceService` for v1 (pre-release). Each check queries the ledger, computes a metric, and classifies against explicit thresholds.

#### DORA

| Requirement | Mechanism | Metric | MET | PARTIAL | GAP | BREACHED |
|---|---|---|---|---|---|---|
| P1 response ≤15m | SLA window from `SocPreferences` | % of P1 incidents resolved within window | 100% | ≥90% | ≥70% | <70% |
| P2 response ≤1h | SLA window from `SocPreferences` | % of P2 incidents resolved within window | 100% | ≥90% | ≥70% | <70% |
| P3 response ≤4h | SLA window from `SocPreferences` | % of P3 incidents resolved within window | 100% | ≥90% | ≥70% | <70% |
| P4 response ≤24h | SLA window from `SocPreferences` | % of P4 incidents resolved within window | 100% | ≥90% | ≥70% | <70% |

Reuses the existing `doraReport()` method's per-priority `slaCompliancePercent` values.

#### SOC2

| Requirement | Mechanism | Metric | MET | PARTIAL | GAP | BREACHED |
|---|---|---|---|---|---|---|
| Containment authorisation | `approverId` in CONTAINMENT_DECISION metadata | % of entries with approverId present | 100% | ≥95% | ≥80% | <80% |
| Audit trail completeness | All step types recorded per incident | % of resolved incidents with ≥4 distinct step types | 100% | ≥90% | ≥70% | <70% |

#### NIS2

| Requirement | Mechanism | Metric | MET | PARTIAL | GAP | BREACHED |
|---|---|---|---|---|---|---|
| Initial triage ≤30m | Time from ALERT_TRIAGE to INCIDENT_PROMOTED | % of incidents triaged within 30 minutes | 100% | ≥90% | ≥70% | <70% |
| Incident reporting ≤24h (proxy) | Time from ALERT_TRIAGE to INCIDENT_RESOLVED | % of incidents resolved within 24 hours | 100% | ≥90% | ≥70% | <70% |

**NIS2 note:** Article 23 requires initial notification to the competent authority within 24 hours — not resolution. There is no `INCIDENT_REPORTED` step type in `SocStepType`. This metric uses resolution time as a v1 proxy. When a reporting workflow is added (separate issue), replace with triage-to-report time.

**Evidence URLs:** Each requirement links to the DORA report endpoint or the audit trail entries filtered by the relevant step type: `evidenceUrl = "/api/soc/compliance/entries?stepType=CONTAINMENT_DECISION"` etc.

**Query approach per check:**
- **DORA:** Reuses existing `doraReport(from, to, tenancyId)` — reads `PriorityStats.slaCompliancePercent` per priority. Zero-incident priorities produce no row (vacuously true compliance is misleading — better to show no data).
- **SOC2 containment authorisation:** `findByStepType(CONTAINMENT_DECISION, tenancyId)` filtered by date range in-memory, then count entries where `metadata` contains `"approverId"` vs total.
- **SOC2 audit trail completeness:** `findByTimeRange(from, to, tenancyId)`, group by `incidentId`, count distinct `stepType` values per incident, compute % with ≥4 distinct types.
- **NIS2 triage timing:** `findByTimeRange(from, to, tenancyId)`, group by `incidentId`, find ALERT_TRIAGE and INCIDENT_PROMOTED pairs, compute durations, evaluate against 30m threshold.
- **NIS2 incident reporting (proxy):** Same as DORA report pattern — reuse triage-to-resolution durations from `doraReport()`.

**Configuration note:** Thresholds are hardcoded for v1. A pre-release platform — changing thresholds means changing code, which is acceptable. If tenant-specific thresholds are needed later, migrate to `PreferenceKey<>` constants (same pattern as `SocPreferences` SLA windows).

### Query time range

The summary endpoint accepts `from` and `to` query parameters (same as DORA report). Defaults to last 30 days if omitted.

---

## Component 3: `<blocks-gdpr-erasure-action>` (blocks-ui, used directly)

Tag:
```html
<blocks-gdpr-erasure-action
  endpoint="/api/soc/compliance/erasure"
  subject-label="Actor"
  .reasonOptions=${['GDPR_ART_17_REQUEST', 'RETENTION_EXPIRED', 'ACCOUNT_DELETION']}
></blocks-gdpr-erasure-action>
```

### Semantic mapping (R1-09 resolution)

The component's `subjectId` form field represents the **person** (data subject) whose identity is erased, not a ledger `subjectId` (incident UUID). The `subject-label="Actor"` property changes the form label to "Actor ID" — making it clear the user should enter the person identifier (e.g., analyst email or employee ID), not an incident UUID.

In the SOC ledger:
- `SocLedgerEntry.subjectId` = CaseInstance UUID (the incident)
- `SocLedgerEntry.actorId` = the person who performed the step (tokenised via `ActorIdentityProvider`)

GDPR erasure targets `actorId` — the person. The REST endpoint maps: component's `subjectId` → `LedgerErasureService.erase(rawActorId=subjectId, reason)`.

### ErasureReason mapping (R1-11 resolution)

The component sends `reason` as the raw string from `reasonOptions`. The REST endpoint maps display strings to enum values:

```java
private static final Map<String, ErasureReason> REASON_MAP = Map.of(
    "GDPR_ART_17_REQUEST", ErasureReason.GDPR_ART_17_REQUEST,
    "RETENTION_EXPIRED", ErasureReason.RETENTION_EXPIRED,
    "ACCOUNT_DELETION", ErasureReason.ACCOUNT_DELETION
);
```

Using raw enum names as `reasonOptions` is acceptable for v1 — the audience is SOC compliance admins who understand the regulatory context, and the confirm dialog provides additional clarity. If polished display names are needed later, extend the component to support `{ value, label }` option pairs.

### Response adaptation (R1-12 resolution)

`LedgerErasureService.erase()` returns `ErasureResult(rawActorId, mappingFound, affectedEntryCount, receiptEntryId)`. The REST endpoint adapts:

```java
public record ErasureResponse(
    String erasureId,  // null when receipt disabled
    String status,
    String timestamp,
    long entryCount) {}

// In the resource method:
return new ErasureResponse(
    result.receiptEntryId().map(UUID::toString).orElse(null),
    result.mappingFound() ? "WITHDRAWN" : "ALREADY_WITHDRAWN",
    Instant.now().toString(),
    result.affectedEntryCount()
);
```

A response DTO record is used instead of `Map.of()` because `Map.of()` throws `NullPointerException` on null values — `receiptEntryId` is `Optional.empty()` when `LedgerConfig.erasureReceipt().enabled()` is false (test environments). Jackson serialises null record fields as JSON `null`, which the component handles gracefully.

### Erasure semantics (R1-10 note)

The component's built-in warning says "permanently erased." In practice, `LedgerErasureService` performs token-severing — it deletes the identity mapping so entries become unlinkable to the person, but the entries themselves remain for audit integrity. This is a valid GDPR Art.17 approach (anonymisation satisfies erasure obligations). The component's warning text is conservatively correct — from the data subject's perspective, their personally identifiable data IS permanently erased.

### REST endpoint

`POST /api/soc/compliance/erasure`

Request: `{ "subjectId": "analyst@soc.example.com", "reason": "GDPR_ART_17_REQUEST" }`

Response: `{ "erasureId": "uuid", "status": "WITHDRAWN", "timestamp": "...", "entryCount": 42 }`

RBAC: `@RolesAllowed("soc-compliance-admin")` — separate from the `soc-compliance-viewer` role used by read endpoints.

---

## REST Endpoints (new)

| Endpoint | Method | Role | Returns | Source |
|---|---|---|---|---|
| `/api/soc/compliance/entries` | GET | `soc-compliance-viewer` | Paginated `SocAuditEntry[]` with PII sanitisation | New query in `SocComplianceService` |
| `/api/soc/compliance/entries/actors` | GET | `soc-compliance-viewer` | `List<String>` — distinct actor IDs for date range | New query in `SocLedgerEntryRepository` |
| `/api/soc/compliance/summary` | GET | `soc-compliance-viewer` | `RequirementDefinition[]` | New method in `SocComplianceService` |
| `/api/soc/compliance/erasure` | POST | `soc-compliance-admin` | `ErasureResponse` | `LedgerErasureService.erase()` with response adaptation |

Existing endpoints (unchanged): `/proof/{entryId}`, `/timeline/{incidentId}`, `/dora`

---

## Repository Changes

### New: `SocLedgerEntryRepository.findFiltered()`

Combined filterable query with optional predicates and pagination. This is a new query method — not a composition of existing single-predicate methods.

```java
public List<SocLedgerEntry> findFiltered(
        Instant from, Instant to,
        SocStepType stepType,   // nullable — omit filter if null
        String actorId,          // nullable
        UUID incidentId,         // nullable
        int page, int size,
        String tenancyId) {
    // Dynamic JPQL with CriteriaBuilder for optional predicates
    // ORDER BY e.occurredAt DESC
    // setFirstResult(page * size), setMaxResults(size)
}

public long countFiltered(
        Instant from, Instant to,
        SocStepType stepType, String actorId, UUID incidentId,
        String tenancyId) {
    // Same predicates, COUNT query for pagination metadata
}

public List<String> findDistinctActors(Instant from, Instant to, String tenancyId) {
    // SELECT DISTINCT e.actorId FROM SocLedgerEntry e
    // WHERE e.occurredAt >= :from AND e.occurredAt <= :to
    // AND e.tenancyId = :tenancyId AND e.actorId IS NOT NULL
    // ORDER BY e.actorId ASC
}
```

---

## TypeScript View

### `compliance/compliance-view.ts`

```typescript
import { rows, html as pagesHtml } from "@casehubio/pages-ui";
import type { Component } from "@casehubio/pages-ui";
import "@casehubio/blocks-ui-compliance-summary";
import "@casehubio/blocks-ui-gdpr-erasure-action";
import "./soc-audit-trail.js";

export function complianceView(): Component {
  return rows(
    auditTrail(),
    complianceSummary(),
    gdprErasure()
  );
}

function auditTrail(): Component {
  return pagesHtml(`
    <soc-audit-trail endpoint="/api/soc/compliance"></soc-audit-trail>
  `);
}

function complianceSummary(): Component {
  return pagesHtml(`
    <blocks-compliance-summary
      endpoint="/api/soc/compliance/summary"
    ></blocks-compliance-summary>
  `);
}

function gdprErasure(): Component {
  return pagesHtml(`<div id="compliance-erasure-container"></div>`, {
    onMount: (el: HTMLElement) => {
      const erasure = document.createElement('blocks-gdpr-erasure-action');
      erasure.setAttribute('endpoint', '/api/soc/compliance/erasure');
      erasure.setAttribute('subject-label', 'Actor');
      (erasure as any).reasonOptions = [
        'GDPR_ART_17_REQUEST', 'RETENTION_EXPIRED', 'ACCOUNT_DELETION'
      ];
      el.appendChild(erasure);
    }
  });
}
```

The `reasonOptions` property needs programmatic setting (array, not an HTML attribute). This is handled in `gdprErasure()` via `onMount` callback — the element is created programmatically with the property set before DOM insertion, avoiding fragile `querySelector` patterns in `boot()`.

### `index.ts` changes

```typescript
// Replace:
["Compliance", placeholder("Compliance", "Phase 4")],
// With:
["Compliance", complianceView()],
```

No selection wiring needed — the compliance view is a dashboard, not a drill-down. The audit trail's incident links navigate to the Incidents view via hash change.

---

## Integration with index.ts

Replace the Compliance placeholder:

```typescript
// Before:
["Compliance", placeholder("Compliance", "Phase 4")],

// After:
import { complianceView } from "./compliance/compliance-view.js";
// ...
["Compliance", complianceView()],
```

No `wireComplianceSelection()` or `initComplianceFromUrl()` needed — the compliance view is self-contained. Incident links in the audit trail navigate via `location.hash = '#incidents/' + incidentId`.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Entries endpoint returns empty | `pages-table` shows empty state |
| Entries endpoint fails | `soc-audit-trail` shows error with retry button |
| Merkle proof verification fails for an entry | Red banner below the row: "Verification failed" |
| Compliance summary returns empty | `blocks-compliance-summary` shows "No regulatory requirements defined" |
| Erasure for unknown actor ID | `LedgerErasureService` returns `mappingFound=false` → receipt shows `ALREADY_WITHDRAWN` status |
| Erasure endpoint auth failure (missing `soc-compliance-admin`) | HTTP 403 → component shows error |
| PII sanitiser failure | Entry's metadata replaced with `[SANITISATION_FAILED]`, logged at ERROR (fail-closed) |

---

## Testing Strategy

| Level | What | How |
|---|---|---|
| Unit | `SocLedgerEntryRepository.findFiltered()` with various filter combinations | `@QuarkusTest` with seeded entries |
| Unit | `SocLedgerEntryRepository.countFiltered()` matches `findFiltered()` size | `@QuarkusTest` |
| Unit | Compliance summary computation — DORA thresholds | `@QuarkusTest` with seeded entries producing known SLA percentages |
| Unit | Compliance summary — SOC2 containment authorisation check | `@QuarkusTest` with entries having/missing `approverId` |
| Unit | Compliance summary — NIS2 triage timing check | `@QuarkusTest` with entries at various timing offsets |
| Unit | Erasure endpoint maps `subjectId` to `rawActorId` correctly | `@QuarkusTest` with mock `LedgerErasureService` |
| Unit | Erasure response adaptation — all fields populated | `@QuarkusTest` |
| Unit | Entries endpoint applies PII sanitisation | `@QuarkusTest` — seed entry with PII in metadata, verify sanitised in response |
| Unit | Entries endpoint pagination — page/size parameters respected | `@QuarkusTest` |
| Integration | Full compliance view renders three components | Browser test via Quinoa dev server |

---

## Files Changed

| File | Change |
|---|---|
| `app/src/main/java/io/casehub/soc/rest/SocComplianceResource.java` | Add 3 endpoints: entries, summary, erasure |
| `app/src/main/java/io/casehub/soc/engine/compliance/SocComplianceService.java` | Add filteredEntries(), complianceSummary() methods |
| `app/src/main/java/io/casehub/soc/engine/compliance/SocLedgerEntryRepository.java` | Add findFiltered(), countFiltered() |
| `app/src/main/java/io/casehub/soc/domain/SocAuditEntry.java` | New — entries REST response DTO |
| `app/src/main/java/io/casehub/soc/domain/ErasureResponse.java` | New — erasure REST response DTO |
| `app/src/test/java/io/casehub/soc/rest/SocComplianceResourceTest.java` | New — tests for entries, summary, erasure endpoints |
| `app/src/test/java/io/casehub/soc/engine/compliance/SocComplianceServiceTest.java` | Existing — add tests for new methods |
| `app/src/main/webui/src/compliance/compliance-view.ts` | New — Compliance tab layout |
| `app/src/main/webui/src/compliance/soc-audit-trail.ts` | New — SOC audit trail component |
| `app/src/main/webui/src/index.ts` | Replace Compliance placeholder with complianceView() |
| `app/src/main/webui/package.json` | Add `@casehubio/blocks-ui-compliance-summary`, `@casehubio/blocks-ui-gdpr-erasure-action`, `@casehubio/pages-table`, `@casehubio/pages-ui-components` (direct imports by soc-audit-trail) |

---

## Review Findings Resolved

| Finding | Resolution |
|---|---|
| R1-03 (HIGH): PII sanitisation gap for cross-incident endpoint | Explicit: entries endpoint applies `SocPiiSanitiser` to every entry's metadata. Spec §Component 1 states "PII sanitisation is mandatory." |
| R1-06 (HIGH): No threshold definitions for compliance badges | Explicit threshold tables per framework in §Component 2. MET/PARTIAL/GAP/BREACHED with percentage breakpoints. |
| R1-09 (HIGH): subjectId vs actorId semantic collision | `subject-label="Actor"` on component. Spec §Component 3 explicitly documents: component subjectId = person's actorId, not incident UUID. REST endpoint maps subjectId → rawActorId. |
| R1-02 (MED): Pagination claim unsupported by existing repos | Acknowledged: `findFiltered()` is a new query method with CriteriaBuilder, not a reuse of existing single-predicate queries. |
| R1-07 (MED): Requirement registry unresolved | Hardcoded in `SocComplianceService` for v1 (pre-release). Configurable thresholds via `PreferenceKey<>` if tenant-specific needs arise. |
| R1-10 (MED): Component warning misrepresents erasure | Acknowledged: warning is conservatively correct — PII IS permanently erased (identity mapping deleted). Entries remain but are anonymised, which satisfies GDPR Art.17. |
| R1-11 (MED): ErasureReason display-to-enum mapping | Raw enum names used as `reasonOptions` — acceptable for compliance admin audience. String-to-enum map in REST endpoint. |
| R1-16 (MED): Platform enhancement for configurable audit-trail-viewer | Platform follow-up issue to be filed: configurable URL patterns and optional `subjectId`. |
| R1-12 (LOW): Response shape adaptation | Explicit adaptation code in §Component 3, including `timestamp` from `Instant.now()`. |
| R1-04 (LOW): "Reuses queries" misleading | Fixed: spec says "new query method" not "reuse". |
| R1-14 (LOW): Role naming coherence | Verified: `soc-` prefix and `-viewer`/`-admin` pattern consistent. |
| R1-18 (LOW): No platform erasure REST endpoint | Noted as platform contribution opportunity. SOC-specific endpoint for v1. |
| R1-19 (LOW): PII sanitisation at service layer not serialisation layer | Acceptable for v1. Serialisation-layer sanitiser is a platform concern. |

### Spec Review Findings Resolved

| Finding | Resolution |
|---|---|
| S-R1-02 (HIGH): `Map.of()` NPE when erasure receipt disabled | Use `ErasureResponse` record DTO instead of `Map.of()` — null fields serialise as JSON null |
| S-R1-03 (HIGH): `reasonOptions` wiring disconnected from index.ts | `gdprErasure()` creates element programmatically with `onMount` callback — no fragile querySelector |
| S-R1-04 (HIGH): Pagination contract undefined | Explicit JSON response shape: `{ content, totalElements, totalPages, page, size }` |
| S-R1-06 (MED): SocComplianceResourceTest claimed existing | Fixed — marked as New |
| S-R1-07 (MED): Client-side vs server-side filtering undecided | Committed to server-side filtering; filter changes reset to page 0 |
| S-R1-08 (MED): Actor dropdown from current page only | Added `/entries/actors` endpoint returning distinct actors for date range |
| S-R1-09 (MED): NIS2 reporting conflated with resolution | Documented as v1 proxy metric; future `INCIDENT_REPORTED` step type replaces it |
| S-R1-10 (MED): complianceSummary() query logic unspecified | Added query approach per check (which repo method, in-memory aggregation pattern) |
| S-R1-12 (LOW): Zero-incident DORA edge case | Zero-incident priorities produce no row — vacuously true compliance is misleading |
| S-R1-13 (LOW): Summary time range not configurable from UI | Intentional for v1 — uses server default (30 days). Stated explicitly in spec. |
| S-R1-14 (LOW): Platform follow-up not tracked | To be filed as GitHub issue during implementation |
| S-R1-15 (LOW): Table sort without server-side support | Client-side sort via `pages-table client-sort` — sufficient for page-sized datasets |
| S-R1-16 (LOW): Package.json deps may be incomplete | Additional deps resolved during implementation based on actual imports |

---

## References

- `app/src/main/java/io/casehub/soc/rest/SocComplianceResource.java` — existing 3 endpoints
- `app/src/main/java/io/casehub/soc/engine/compliance/SocComplianceService.java` — existing service
- `app/src/main/java/io/casehub/soc/engine/compliance/SocLedgerEntryRepository.java` — existing queries
- `app/src/main/java/io/casehub/soc/engine/compliance/SocPiiSanitiser.java` — PII sanitisation
- `blocks-ui/components/audit-trail-viewer/src/audit-trail-viewer.ts` — URL hardcoding, visual patterns to follow
- `blocks-ui/components/compliance-summary/src/types.ts` — RequirementDefinition contract
- `blocks-ui/components/gdpr-erasure-action/src/gdpr-erasure-action.ts` — erasure flow, ErasureReceipt contract
- `io.casehub.ledger.runtime.privacy.LedgerErasureService` — platform erasure API
- `io.casehub.ledger.api.model.ErasureReason` — GDPR_ART_17_REQUEST, RETENTION_EXPIRED, ACCOUNT_DELETION
- `docs/specs/issue-21-trust-cbr-compliance/2026-08-11-compliance-audit-evidence-design.md` — compliance backend design
- `docs/specs/issue-26-soc-web-app/2026-08-14-soc-web-app-design.md` — Phase 4 layout definition
- `docs/specs/issue-30-trust-routing-dashboards/2026-08-21-trust-routing-dashboards-design.md` — Phase 3 patterns
- `app/src/main/webui/src/trust/trust-view.ts` — reference implementation for view structure
