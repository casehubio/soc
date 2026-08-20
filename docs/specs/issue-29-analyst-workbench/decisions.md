## D1: Approval gate role

**Choice:** Embed `blocks-approval-gate` as the completion mechanism for the analyst-review WorkItem inside work-item-detail. The gate presents the four YAML-defined outcomes (CONFIRM_SEVERITY, DOWNGRADE, ESCALATE, FALSE_POSITIVE) with prompt, evidence, and confirmation. `gate.decided` triggers WorkItem `complete` API call.
**Alternatives:**
- Standalone containment approval as a separate WorkItem — requires new YAML binding, second human task that doesn't exist in the workflow
- Two separate gates (triage + containment) — over-engineered for the current single-decision workflow
**Rationale:** The analyst-review WorkItem IS the approval decision. The approval-gate component gives a richer UX (prompt, evidence, confirmation) than the default completion buttons. A separate containment gate is a future concern when the workflow adds a distinct containment execution step.
**Trade-offs:** If containment approval needs its own step later, it's a new WorkItem + gate addition, not a refactor.
**Sources:** issue-11 spec (analyst-review YAML binding, outcomes), blocks-ui approval-gate component source
**Exploration:** quick
**Status:** captured

## D2: Work item and notification API layer

**Choice:** REST — use platform's `casehub-work-rest` and `casehub-platform-notification` REST modules directly. Add as Maven dependencies; JAX-RS resources auto-register in Quarkus. blocks-ui components point to the platform's REST base paths. SOC adds only SOC-specific endpoints (case notes, IOC submission) following the Phase 1 REST pattern.
**Alternatives:**
- GraphQL — platform has full GraphQL layer (WorkItemQueryResolver, subscriptions), but blocks-ui components are REST-native. Rewriting their data layer would be pointless rework.
- SOC proxy REST — create SocWorkItemResource wrapping platform API. Duplicates platform REST logic for no gain.
**Rationale:** blocks-ui components use fetch() against REST endpoints. Platform REST modules already provide everything the inbox, detail, and notification components expect. No translation layer needed.
**Trade-offs:** No SOC-specific filtering in the work item list — relies on platform's candidate-group filtering. Acceptable because SOC work items have `candidateGroups: soc-tier1-analyst`.
**Sources:** blocks-ui work-item-inbox source (REST fetch pattern), casehub-work-rest WorkItemResource (@Path("/workitems")), casehub-platform notification REST module
**Exploration:** quick
**Status:** captured

## D3: Case notes scope

**Choice:** Case-level investigation notes via Qhorus channel messages. Analyst notes are dispatched as INFORM speech acts on the incident's `/observe` channel via the platform's `MessageService.dispatch()`. The `blocks-channel-activity` component (already wired in Phase 1's Channels tab) renders them. No new REST endpoint needed — the Qhorus channel REST API handles message creation.
**Alternatives:**
- CaseContext storage via `POST /api/soc/incidents/{id}/notes` — CaseContext stores structured machine data (iocEnrichment, attckMapping), not free-text prose. Mixing analyst notes into CaseContext creates an unbounded growing list in a store that bindings repeatedly deserialize. No built-in authorship, timestamps, or threading.
- WorkItem-level notes via platform `/workitems/{id}/notes` — scoped to a single work item. Notes not visible across the incident lifecycle or across multiple work items for the same incident.
**Rationale:** Qhorus channels already provide sequential, timestamped, authored messages with ACL, rate limiting, and ledger writes. Investigation notes are a natural fit — they persist beyond work item lifecycle, are visible to all analysts on the case, and render in the existing channel-activity component.
**Trade-offs:** Notes are interleaved with worker output (COMMAND/DONE speech acts) in the channel feed. If analyst notes need separate display, a filter by speech act type is needed.
**Sources:** Qhorus MessageService API, blocks-ui channel-activity component (Phase 1), decision review R1-03
**Exploration:** quick
**Status:** revised (was: CaseContext storage; revised per R1-03 finding)

## D4: Incident context in workbench detail

**Choice:** Reuse Phase 1 endpoints. The work item's `inputMapping` includes `incidentId`. The detail pane fetches from existing `/api/soc/incidents/{incidentId}/iocs`, `/api/soc/incidents/{incidentId}/attck`, etc. The approval gate's evidence slot renders a summary of live investigation data.
**Alternatives:**
- Embedded in work item payload — `inputMapping` copies alert, iocEnrichment, attckMapping, but data is a snapshot from creation time, stale if investigation progresses
- New composite endpoint `/api/soc/workitems/{id}/context` — clean API but duplicates existing endpoints
**Rationale:** Phase 1 endpoints already serve this data. Using `incidentId` from the work item payload to fetch live data means the analyst always sees current investigation state. No new endpoints needed.
**Trade-offs:** Two fetches (work item + incident data) instead of one. Acceptable — the work item detail loads first, then incident context loads in parallel.
**Depends on:** D2 (REST for UI)
**Sources:** issue-11 spec (inputMapping includes incidentId), SocIncidentResource endpoints from Phase 1
**Exploration:** quick
**Status:** captured

## D5: Notification scope

**Choice:** Wire the `blocks-notification-inbox` component to the sidebar bell with the platform notification REST endpoint. Defer SOC-specific notification subscriptions (P1 alerts, SLA warnings, escalation events) to a separate issue.
**Alternatives:**
- Full notification setup — wire component AND define SOC subscriptions for key events. More complete but mixes UI composition work with product/subscription design.
**Rationale:** Wiring the component is pure composition — a few lines. The inbox works with zero subscriptions (empty state). Designing which events matter and what thresholds to set is a product decision, not a UI concern. Can be configured later via the subscription API without code changes.
**Trade-offs:** Notification bell is functional but empty until subscriptions are configured. Analysts won't receive push notifications for SOC events until follow-up work.
**Depends on:** D2 (REST for UI)
**Sources:** blocks-ui notification-inbox component, casehub-platform notification REST module
**Exploration:** quick
**Status:** captured
