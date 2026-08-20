# Phase 2: Analyst Workbench — Design Spec

**Date:** 2026-08-20
**Issue:** casehubio/soc#29 — Phase 2: Analyst workbench — work-items, SLA, approval, notes, IOC submission
**Epic:** casehubio/soc#26 — SOC Incident Response Web Application
**Branch:** issue-29-analyst-workbench

---

## Overview

Replaces the Workbench placeholder with a composed analyst work queue. Built entirely from existing blocks-ui components backed by platform REST APIs. Two SOC-specific additions: a manual IOC submission endpoint and `SocEscalatedWorkItemHandler` (bridges ESCALATED WorkItem → case context, spec'd in issue-11 but not yet implemented).

No new blocks-ui components. No SOC wrapper around platform APIs. The work is composition, wiring, and two backend classes.

---

## Architecture

```
Browser — Workbench View
┌──────────────────────────────────────────────────────────────┐
│  columns([40, 60])                                           │
│  ┌──────────────────────┐  ┌───────────────────────────────┐ │
│  │ LIST PANE             │  │ DETAIL PANE (SOC-specific)    │ │
│  │                       │  │                               │ │
│  │ <blocks-work-item-    │  │ <blocks-sla-indicator>        │ │
│  │  inbox>               │  │                               │ │
│  │   endpoint="/workitems│  │ Investigation context:        │ │
│  │   "                   │  │   alert, IOC, ATT&CK summary │ │
│  │   identity={...}      │  │   (from Phase 1 endpoints)    │ │
│  │                       │  │                               │ │
│  │ Tabs: My Work |       │  │ <blocks-approval-gate>        │ │
│  │  Claimable | All      │  │   outcomes=[CONFIRM, DOWN-    │ │
│  │                       │  │   GRADE, ESCALATE, FP]        │ │
│  │                       │  │                               │ │
│  │                       │  │ Case notes (channel dispatch) │ │
│  │                       │  │ IOC submission form           │ │
│  └──────────────────────┘  └───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                          │ HTTP / SSE
┌─────────────────────────┼────────────────────────────────────┐
│  Quarkus (app/)         │                                     │
│  WorkItemResource       │  (platform — casehub-work-rest)     │
│  NotificationResource   │  (platform — casehub-notification)  │
│  SocIncidentResource    │  (existing Phase 1)                 │
│  SocIocSubmissionRes.   │  (new — POST IOC)                   │
│  SocEscalatedWorkItem   │  (new — bridges ESCALATED → case)   │
│     Handler             │                                     │
└─────────────────────────┴────────────────────────────────────┘
```

**Data flow:** `blocks-work-item-inbox` in the left pane fetches from the platform's work REST endpoint. The right pane is a SOC-specific detail composition (not `blocks-work-item-detail` — the generic detail lacks SOC-specific content like investigation context, triage gate, and case notes). When an analyst selects a work item, the detail pane reads `incidentId` from the work item's payload and fetches investigation context from Phase 1 endpoints. The approval gate presents triage outcomes; `gate.decided` triggers `WorkItemResource.complete()`. Case notes dispatch via Qhorus channel. IOC submission POSTs to a new SOC endpoint.

**Why not `blocks-work-item-workbench`?** The workbench component is itself a split view (`blocks-split-workbench` with inbox + detail). Nesting it inside `columns([40, 60])` would create a split-within-a-split. And the generic `blocks-work-item-detail` doesn't support SOC-specific content (investigation context, triage gate, case notes, IOC form). Using `blocks-work-item-inbox` directly with a SOC detail pane gives full layout control.

---

## Layout Composition (D1, D4)

The Workbench sidebar tab uses `columns([40, 60])` to split into list and detail panes, matching the Phase 1 Incidents view pattern.

**List pane** (left 40%):
- `blocks-work-item-inbox` — three-tab inbox (My Work / Claimable / All) with SSE live updates, batch operations, keyboard shortcuts, queue scoping. Fetches from platform `/workitems/inbox`.

**Detail pane** (right 60%):
- `blocks-sla-indicator` — countdown timer bound to the selected work item's `expiresAt` deadline. Threshold-based colour transitions (normal → warning → critical → breached). Shows current escalation stage from `SocSlaBreachPolicy`.
- Investigation context — fetched from Phase 1 endpoints using `incidentId` from the work item payload:
  - Alert summary (severity, source, timestamp)
  - IOC enrichment summary from `/api/soc/incidents/{incidentId}/iocs`
  - ATT&CK mapping summary from `/api/soc/incidents/{incidentId}/attck`
  - Containment recommendation from work item payload
- `blocks-approval-gate` — triage decision point with four outcomes mapped to the analyst-review YAML binding. Prompt text explains the decision. Evidence slot shows investigation summary. Confirmation dialog before submission. `gate.decided` triggers `WorkItemResource.complete()` with the selected outcome.
- Case notes textarea — dispatches INFORM speech acts to the incident's Qhorus `/observe` channel via `MessageService.dispatch()` REST. Notes appear in the Phase 1 Channels tab via `blocks-channel-activity`.
- IOC submission form — IOC type dropdown, value text input, confidence slider. `POST /api/soc/incidents/{id}/iocs`.

Detail pane components are hidden (empty state) until a work item is selected.

### Approval Gate Outcomes (D1)

The `blocks-approval-gate` accepts arbitrary `OutcomeDefinition[]`. SOC configures four outcomes matching the analyst-review YAML binding:

| Key | Label | Variant | Case Goal |
|---|---|---|---|
| `CONFIRM_SEVERITY` | Confirm Severity | success | resolved |
| `DOWNGRADE` | Downgrade | neutral | resolved |
| `ESCALATE` | Escalate | neutral | escalated |
| `FALSE_POSITIVE` | False Positive | danger | false-positive |

The approval gate's `gate.decided` event carries the outcome key. The wiring code calls `PUT /workitems/{id}/complete` with `{ outcome: key, actorId: identity.userId }`.

### Cross-Component Communication

Same pattern as Phase 1 (hybrid URL + pages events):

1. User clicks work item in inbox → component emits `pages-event` with topic `work-item:selected` and payload `{ workItemId }`.
2. Detail pane listens for selection events, fetches the work item detail, reads `incidentId` from payload, fetches investigation context from Phase 1 endpoints.
3. URL hash updated to `#workitem={workItemId}` for deep-linking. On page load, if hash contains a work item ID, programmatically select it.

---

## TypeScript Module Structure

```
app/src/main/webui/src/
├── index.ts                        # Updated — replace Workbench placeholder
├── incidents/                      # (existing Phase 1)
│   ├── incidents-view.ts
│   └── incident-selection.ts
├── workbench/
│   ├── workbench-view.ts           # View composition (columns, data sources)
│   ├── workbench-selection.ts      # Work item selection → incident context fetch
│   └── soc-triage-gate.ts          # Wires approval-gate with SOC outcomes + evidence
├── components/                     # (existing Phase 1 SOC components)
│   ├── soc-attck-matrix.ts
│   ├── soc-ioc-panel.ts
│   └── soc-alert-heatmap.ts
└── types/
    └── soc-types.ts                # Extended with workbench types
```

### workbench-view.ts

Composes the Workbench sidebar tab. Exports `workbenchView(): Component`.

```typescript
export function workbenchView(): Component {
  return columns([40, 60],
    [listPane()],
    [detailPane()]
  );
}
```

List pane renders `blocks-work-item-inbox` directly with `endpoint` and `identity` props.

Detail pane is SOC-specific composition: SLA indicator, investigation context, approval gate, case notes textarea, IOC submission form. All hidden until a work item is selected.

### workbench-selection.ts

Listens for `work-item:selected` events. On selection:
1. Fetches work item detail from `/workitems/{id}` to read the payload
2. Extracts `incidentId` from the work item's input data
3. Fetches investigation context from Phase 1 endpoints in parallel:
   - `/api/soc/incidents/{incidentId}/timeline`
   - `/api/soc/incidents/{incidentId}/iocs`
   - `/api/soc/incidents/{incidentId}/attck`
4. Updates detail pane components with fetched data
5. Configures the approval gate with work item outcomes and deadline
6. Updates URL hash for deep-linking

### soc-triage-gate.ts

Configures `blocks-approval-gate` for SOC triage:
- Sets four `OutcomeDefinition[]` matching the analyst-review YAML outcomes
- Populates the evidence slot with investigation summary (alert, top IOCs, ATT&CK techniques)
- Sets prompt text: "Review incident findings and containment recommendation"
- Sets deadline from work item's `expiresAt`
- On `gate.decided`: calls `PUT /workitems/{id}/complete` with `{ outcome, actorId }`

---

## Java Backend

### New Classes

**`SocIocSubmissionResource.java`** — `io.casehub.soc.rest`

```java
@Path("/api/soc/incidents/{id}/iocs")
@ApplicationScoped
public class SocIocSubmissionResource {

    @Inject CaseInstanceRepository repository;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response submitIoc(@PathParam("id") UUID id, IocSubmission submission) {
        // Validate submission (type, value required; confidence 0.0-1.0)
        // Read case context, append to iocEnrichment array
        // Return updated IOC list
    }
}
```

Input: `{ type: string, value: string, confidence: number }` where type is one of IP, HASH, DOMAIN, URL, EMAIL.

**`SocEscalatedWorkItemHandler.java`** — `io.casehub.soc.work`

```java
@ApplicationScoped
public class SocEscalatedWorkItemHandler {

    @Inject CaseInstanceRepository repository;

    public void onEscalated(@ObservesAsync WorkItemLifecycleEvent event) {
        // Filter: only ESCALATED events on SOC work items
        // Read case instance from work item's case reference
        // Set analystDecision = "escalated" in case context
        // Case completes via escalated goal
    }
}
```

This bridges the gap between the work module's terminal ESCALATED state and the engine's case goal system. When `SocSlaBreachPolicy` returns `Exhausted`, the work item reaches ESCALATED but no analyst completed it with an outcome. This handler ensures the case still progresses.

### Existing Classes (no changes)

- `SocIncidentResource.java` — Phase 1 endpoints reused for investigation context (D4)
- `SocSlaBreachPolicy.java` — already implemented, provides escalation chains
- `SocIncidentPushService.java` — Phase 1 SSE push

### File Structure

```
app/src/main/java/io/casehub/soc/
├── rest/
│   ├── SocIncidentResource.java         # (existing)
│   ├── SocIncidentPushService.java      # (existing)
│   ├── SocKpiResource.java              # (existing)
│   ├── SocAlertResource.java            # (existing)
│   ├── SocJsonWriterProducer.java       # (existing)
│   ├── dto/IncidentSummaryDto.java      # (existing)
│   └── SocIocSubmissionResource.java    # NEW
└── work/
    ├── SocSlaBreachPolicy.java          # (existing)
    └── SocEscalatedWorkItemHandler.java # NEW
```

---

## Case Notes via Qhorus Channels (D3)

Analyst investigation notes dispatch as INFORM speech acts on the incident's Qhorus `/observe` channel. No new REST endpoint — the platform's Qhorus channel REST API handles message creation.

**Dispatch:** `POST /api/qhorus/channels/{channelId}/messages` with `{ speechAct: "INFORM", content: noteText, actorId: identity.userId }`.

**Display:** Notes appear in the Phase 1 Channels tab via `blocks-channel-activity`. Worker output (COMMAND/DONE) and analyst notes (INFORM) are interleaved chronologically. If separate display is needed, filter by speech act type — but interleaving provides full investigation context.

**Channel resolution:** The Qhorus channel ID is resolved via `GET /api/soc/incidents/{incidentId}/channels` (existing Phase 1 endpoint). The workbench fetches the channel list when loading incident context and uses the `/observe` channel for note dispatch. The channel endpoint already returns channel IDs and metadata.

---

## Notification Bell (D5)

`blocks-notification-inbox` wired to the sidebar as a bell dropdown overlay, pointing at the platform's notification REST endpoint. Functional with zero SOC-specific subscriptions — the inbox renders an empty state. SOC notification subscriptions (P1 alerts, SLA warnings, escalation events) are a separate follow-up issue.

---

## Dependencies

### Maven (app/pom.xml)

```xml
<dependency>
    <groupId>io.casehub</groupId>
    <artifactId>casehub-work-rest</artifactId>
</dependency>
<!-- Notification REST module — verify exact artifactId against platform pom.xml -->
<dependency>
    <groupId>io.casehub</groupId>
    <artifactId>casehub-platform-notification-rest</artifactId>
</dependency>
```

Versions managed by parent BOM. `casehub-pages-push-runtime` already added in Phase 1.

### npm (app/src/main/webui/package.json)

```json
{
  "@casehubio/blocks-ui-work-item-workbench": "file:../../../../../blocks-ui/components/work-item-workbench",
  "@casehubio/blocks-ui-work-item-inbox": "file:../../../../../blocks-ui/components/work-item-inbox",
  "@casehubio/blocks-ui-work-item-detail": "file:../../../../../blocks-ui/components/work-item-detail",
  "@casehubio/blocks-ui-work-item-row": "file:../../../../../blocks-ui/components/work-item-row",
  "@casehubio/blocks-ui-split-workbench": "file:../../../../../blocks-ui/components/split-workbench",
  "@casehubio/blocks-ui-sla-indicator": "file:../../../../../blocks-ui/components/sla-indicator",
  "@casehubio/blocks-ui-approval-gate": "file:../../../../../blocks-ui/components/approval-gate",
  "@casehubio/blocks-ui-notification-inbox": "file:../../../../../blocks-ui/components/notification-inbox"
}
```

Package names to be verified against blocks-ui's actual package.json names at implementation time.

---

## Index.ts Changes

Replace the Workbench placeholder with the composed view:

```typescript
import { workbenchView, wireWorkbenchSelection } from "./workbench/workbench-view.js";
import { initWorkbenchFromUrl } from "./workbench/workbench-selection.js";

const app = page("SOC — Incident Response",
  sidebar(
    ["Incidents", incidentsView()],
    ["Workbench", workbenchView()],          // replaces placeholder
    ["Trust", placeholder("Trust", "Phase 3")],
    ["Compliance", placeholder("Compliance", "Phase 4")],
  )
);

// In boot():
wireWorkbenchSelection();
initWorkbenchFromUrl();
```

Notification bell wiring depends on pages sidebar API — either a dedicated bell slot or a floating overlay.

---

## Review Findings Incorporated

| Finding | Source | Resolution |
|---|---|---|
| Approval-gate semantic mismatch for triage | R1-01 | Acknowledged — component supports arbitrary `OutcomeDefinition[]`, not locked to APPROVE/REJECT. Formal UX (prompt, evidence, confirmation) fits high-stakes triage. |
| Notification REST doesn't exist | R1-02 | False positive — `NotificationResource` exists in `casehub/platform/notifications/`. Reviewer searched wrong project scope. |
| CaseContext wrong for notes; use Qhorus channels | R1-03 | Accepted — D3 revised. Notes dispatch as INFORM speech acts on Qhorus `/observe` channel. |
| inputMapping type (string vs UUID) | R1-04 | Verify at implementation — `.caseId` may need UUID resolution. |
| D5 depends on non-existent notification REST | R1-05 | False positive — see R1-02. |
| No type-based inbox filtering | R1-06 | Acknowledged — candidate-group filtering sufficient for single-app deployment. Note in spec for multi-app scenarios. |
| OversightGateService containment approval undecided | R1-07 | Out of scope — no containment execution step in current workflow. `OversightGateService` is available but NoOp. Future issue when containment execution is added. |

---

## Testing Strategy

### Java Unit Tests

**SocEscalatedWorkItemHandlerTest** — plain JUnit:
- ESCALATED lifecycle event on SOC WorkItem → sets `analystDecision = "escalated"` in case context
- Non-SOC WorkItem ESCALATED event → ignored
- Non-ESCALATED event → ignored

**SocIocSubmissionResourceTest** — plain JUnit:
- POST with valid IOC (type, value, confidence) → appends to case context `iocEnrichment`
- Missing required fields → 400
- Invalid IOC type → 400
- Confidence out of range → 400

### Java Integration Tests

**SocWorkbenchIntegrationTest** — `@QuarkusTest`:
- Platform `WorkItemResource` endpoints accessible (inbox, summary, claim, complete)
- `SocSlaBreachPolicy` active (`casehub.work.sla.breach-policy=soc-escalation`)
- ESCALATED bridge fires: WorkItem reaches ESCALATED → `analystDecision` set in case context → case completes via escalated goal
- IOC submission endpoint works end-to-end

### TypeScript Unit Tests

- **soc-triage-gate** — renders four outcomes, `gate.decided` emits correct outcome key, calls complete endpoint
- **workbench-selection** — work item selected → incident context fetched from correct Phase 1 endpoints
- **workbench-view** — renders split layout with inbox and detail pane

### Manual Verification

- Run `mvn quarkus:dev`, open browser
- Workbench tab loads with work item inbox (three tabs: My Work, Claimable, All)
- Selecting a work item shows SLA countdown, investigation context, approval gate
- Completing with an outcome updates case context correctly
- Case notes textarea dispatches to Qhorus channel, appears in Channels tab
- IOC submission form adds IOC to case context
- Notification bell renders in sidebar (empty inbox)
- URL deep-linking works for selected work items

---

## Files Changed

### New Java Files

| File | Purpose |
|---|---|
| `app/src/main/java/io/casehub/soc/rest/SocIocSubmissionResource.java` | Manual IOC submission endpoint |
| `app/src/main/java/io/casehub/soc/work/SocEscalatedWorkItemHandler.java` | Bridges ESCALATED WorkItem → case context |
| `app/src/test/java/io/casehub/soc/rest/SocIocSubmissionResourceTest.java` | Unit tests |
| `app/src/test/java/io/casehub/soc/work/SocEscalatedWorkItemHandlerTest.java` | Unit tests |
| `app/src/test/java/io/casehub/soc/integration/SocWorkbenchIntegrationTest.java` | Integration tests |

### New TypeScript Files

| File | Purpose |
|---|---|
| `app/src/main/webui/src/workbench/workbench-view.ts` | View composition |
| `app/src/main/webui/src/workbench/workbench-selection.ts` | Work item → incident context wiring |
| `app/src/main/webui/src/workbench/soc-triage-gate.ts` | Approval gate configuration for SOC outcomes |

### Modified Files

| File | Change |
|---|---|
| `app/src/main/webui/src/index.ts` | Replace Workbench placeholder with composed view; add workbench wiring |
| `app/src/main/webui/package.json` | Add blocks-ui work/sla/approval/notification dependencies |
| `app/pom.xml` | Add casehub-work-rest, casehub-platform-notification-rest dependencies |

---

## Design Constraints

| Constraint | Source | Impact |
|---|---|---|
| `blocks-work-item-inbox` expects REST at `{endpoint}/workitems/inbox` | blocks-ui source | Platform `casehub-work-rest` provides this exact pattern |
| `approval-gate` supports arbitrary `OutcomeDefinition[]` | blocks-ui source | SOC configures four triage outcomes, not locked to APPROVE/REJECT |
| Case notes via Qhorus channels, not CaseContext | Decision review R1-03 | CaseContext is structured machine data; Qhorus provides sequential, timestamped, authored messages |
| `SocEscalatedWorkItemHandler` bridges ESCALATED → case context | issue-11 spec | Without this, case stalls when all SLA escalation tiers are exhausted |
| inputMapping `.caseId` type may need UUID verification | Decision review R1-04 | Verify at implementation that `.caseId` is UUID-compatible with `SocIncidentResource` |
| Inbox filtering by candidate groups only | Decision review R1-06 | Sufficient for single-app deployment; type-based filtering available via query param if needed |

---

## References

- [docs/specs/issue-26-soc-web-app/2026-08-14-soc-web-app-design.md] — Epic design spec (Phase 2 section)
- [docs/specs/issue-11-analyst-workitem-sla/2026-08-05-analyst-workitem-sla-design.md] — Analyst WorkItem & SLA Breach Policy
- [docs/specs/issue-28-incidents-view/2026-08-17-incidents-view-design.md] — Phase 1 Incidents View (predecessor patterns)
- [specs/issue-26-soc-web-app/decisions.md] — Epic decisions D1–D5
- [specs/issue-28-incidents-view/decisions.md] — Phase 1 decisions D1–D4
- [blocks-ui/components/work-item-workbench/src/work-item-workbench.ts] — Workbench component API
- [blocks-ui/components/work-item-inbox/src/work-item-inbox.ts] — Inbox component (REST endpoints, SSE, tabs)
- [blocks-ui/components/approval-gate/src/approval-gate.ts] — Approval gate (OutcomeDefinition, quorum, evidence)
- [blocks-ui/components/sla-indicator/src/sla-indicator.ts] — SLA countdown component
- [blocks-ui/components/notification-inbox/src/notification-inbox.ts] — Notification inbox component
- [blocks-ui/components/notification-inbox/src/api.ts] — Notification REST API client
- [work/rest/src/main/java/io/casehub/work/rest/WorkItemResource.java] — Platform work REST API
- [platform/notifications/src/main/java/io/casehub/platform/notification/rest/NotificationResource.java] — Platform notification REST
- [app/src/main/java/io/casehub/soc/rest/SocIncidentResource.java] — Phase 1 incident endpoints
- [app/src/main/java/io/casehub/soc/work/SocSlaBreachPolicy.java] — SLA breach escalation
- [Decision review R1-03] — Qhorus channels for case notes
