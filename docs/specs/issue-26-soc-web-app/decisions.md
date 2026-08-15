## D1: REST endpoint location

**Choice:** In `app/` alongside existing SOC code — SocIncidentResource, SocComplianceResource, etc.
**Alternatives:**
- New `ui/` module — isolates UI concerns but adds module overhead
- Generic pages data-serving — no SOC-specific JAX-RS, but limited flexibility
**Rationale:** Same module as workers and engine wiring. Simple, follows existing app/ pattern.
**Trade-offs:** UI endpoint code mixed with engine wiring in app/.
**Exploration:** quick
**Status:** captured

## D2: SOC-specific gap components

**Choice:** New blocks-ui components — attck-matrix, ioc-panel, alert-heatmap as reusable Web Components
**Alternatives:**
- Pages primitives only — faster but not reusable across security apps
- Defer gaps — skip for now, add later
**Rationale:** Other security apps (future) could reuse ATT&CK visualization and IOC panels. Worth the upfront investment.
**Trade-offs:** Cross-repo work in blocks-ui. Requires blocks-ui contribution process.
**Exploration:** quick
**Status:** captured

## D3: Navigation model

**Choice:** Sidebar navigation — left sidebar with Incidents, Workbench, Trust, Compliance
**Alternatives:**
- Tab navigation — simpler but less space-efficient
- Dock bar — power-user, complex
**Rationale:** Standard SOC dashboard layout. Sidebar allows quick view switching with full content area.
**Trade-offs:** Sidebar consumes horizontal space on smaller screens.
**Exploration:** quick
**Status:** captured

## D4: Phase ordering

**Choice:** Phase 0 (full skeleton) → Phase 1 (incidents) → Phase 2 (analyst workbench) → then trust/compliance
**Alternatives:**
- Incidents first, no skeleton — validates end-to-end but no navigation until Phase 2
- Analyst workbench first — daily tool but needs incidents to exist
**Rationale:** Skeleton validates layout and navigation early. Views can then be filled in any order.
**Trade-offs:** Phase 0 delivers no working functionality — pure structure.
**Exploration:** quick
**Status:** captured

## D5: Data entry

**Choice:** Existing blocks-ui components cover core data entry (WorkItem completion, approval gate, preferences). Add case notes (textarea bound to case context) and manual IOC submission (form with POST endpoint) as additional features.
**Alternatives:**
- Existing components only — no case notes or IOC submission
**Rationale:** Case notes and IOC submission are standard SOC analyst workflows. Simple forms — low effort, high value.
**Trade-offs:** Two additional REST endpoints and forms to maintain.
**Depends on:** D1 (endpoints in app/)
**Exploration:** quick
**Status:** captured
