## D1: Trust view layout model

**Choice:** Hybrid — fleet overview top, case routing drill-down bottom
**Alternatives:**
- Agent selection (list+detail like Phases 1-2) — consistent UX but 6 agents is too few for a list pane; similarity panel is case-scoped, not agent-scoped
- Dashboard (all at once) — more at-a-glance but less routing detail per case
- Use `blocks-trust-workbench` as-is — the existing composite has a list+detail split, but the SOC fleet overview concern doesn't map to it (R1-03 review finding accepted in part)
**Rationale:** The Trust view serves two distinct concerns: fleet health (how are all agents performing?) and routing explanation (why was this case routed this way?). Hybrid naturally separates them. Fleet overview is always visible; drill-down populates when a case is selected. The existing `blocks-trust-workbench` is used for the drill-down section (routing decisions + feedback), while the fleet overview is composed from `blocks-trust-score-panel` instances.
**Trade-offs:** More complex layout than pure list+detail. Two data-loading contexts (fleet-global vs case-specific).
**Exploration:** quick
**Status:** revised (R1-03)

## D2: Case source for routing drill-down

**Choice:** Recent cases list inline in the Trust view — compact list of last 10-20 resolved incidents
**Alternatives:**
- Cross-tab from Incidents — selecting an incident in Incidents tab carries to Trust tab. Couples views.
- Both (inline list + cross-tab linking) — more entry points, more wiring complexity
**Rationale:** Self-contained — no cross-tab state management. The analyst can explore trust context without leaving the Trust view. Recent cases are the most relevant for understanding current trust behaviour.
**Trade-offs:** Duplicates some data from the Incidents view (recent case list). Lightweight though — compact row, not full incident detail.
**Exploration:** quick
**Status:** captured

## D3: Fleet overview display

**Choice:** `blocks-trust-score-panel` instances in a CSS grid (3×2)
**Alternatives:**
- Custom card grid (soc-trust-fleet-grid) — would reimplement score display that trust-score-panel already provides (R1-05)
- Table — rows=agents, columns=dimensions. Compact, sortable, less visual.
- Grouped by capability — three groups, rule vs LLM side-by-side
**Rationale:** 6 `blocks-trust-score-panel` instances in a grid provides the same visual affordance as custom cards while reusing the platform component. Each instance shows global score, dimension breakdown, observation counts, and maturity phase — richer than what a custom card would provide at lower implementation cost.
**Trade-offs:** Less control over card density — `trust-score-panel` may be taller than a minimal card. Acceptable — fleet overview has the full top section.
**Sources:** `blocks-ui/components/trust-score-panel/` — existing component
**Exploration:** quick
**Status:** revised (R1-05)

## D4: Trust data refresh strategy

**Choice:** All three modes available, UI-configurable — SSE push, periodic polling (30s default), and manual refresh
**Alternatives:** None — user requirement, not a design choice
**Rationale:** Different operational contexts need different refresh modes. SOC manager monitoring a live incident wants SSE push. Analyst reviewing historical routing decisions needs manual. Periodic is the sensible default.
**Trade-offs:** Must wire SSE topic (soc:trust) even though trust scores change infrequently. Additional UI configuration surface. The correct CDI event is `TrustScoreActorUpdatedEvent` (R1-06).
**Exploration:** quick
**Status:** revised (R1-06)

## D5: CBR similarity display

**Choice:** SOC summary banner wrapping `blocks-similarity-panel`
**Alternatives:**
- New `soc-similarity-panel` component — reimplements table rendering and precedent selection (R1-04)
- `blocks-similarity-panel` alone — no summary stats
**Rationale:** `blocks-similarity-panel` already renders a sortable table with similarity progress bars and outcome badges. The SOC addition is the summary statistics banner ("4 of 5 similar incidents were confirmed threats, avg resolution 24 min"). This is a thin SOC wrapper — a small Lit element that computes aggregate stats and renders a banner above the existing component. The `Precedent` interface's `[key: string]: unknown` extension point carries SOC-specific fields (alertType, attckTechniqueIds) without interface changes.
**Trade-offs:** Summary computation happens server-side in the REST endpoint. Wrapper adds a thin layer.
**Depends on:** D1 (similarity section lives in the drill-down)
**Sources:** `blocks-ui/components/similarity-panel/src/types.ts` — Precedent interface
**Exploration:** quick
**Status:** revised (R1-04)

## D6: Routing rationale depth

**Choice:** Full candidate comparison via `blocks-routing-rationale` component — shows all candidates with trust scores, phases, workload, exclusion reasons, and policy summary
**Alternatives:**
- New `soc-routing-rationale` with 4-field data contract — would drop 5 of 9 CandidateScore fields, losing transparency that is the stated goal (R1-02)
- Winner only — just the selected agent and its score. Simpler but opaque.
**Rationale:** `blocks-routing-rationale` already renders the full `RoutingRationaleData` with trust score bars, threshold markers, borderline bands, maturity phases, policy summaries, and human-readable rationale text. The data comes directly from `WorkerDecisionEntry.routingRationale` (R1-01) — no reconstruction needed. SOC gets richer transparency than the original spec proposed, at lower implementation cost.
**Trade-offs:** None significant — the platform component and persisted data already provide exactly what D6 requires.
**Depends on:** D7 (data source provides the RoutingRationaleData)
**Sources:** `blocks-ui/components/routing-rationale/src/types.ts` — RoutingRationaleData, CandidateScore
**Exploration:** quick
**Status:** revised (R1-01, R1-02, R1-07)

## D7: Routing rationale data source

**Choice:** Deserialize `WorkerDecisionEntry.routingRationale` directly — the platform already persists the full routing decision at selection time
**Alternatives:**
- ~~Reconstruct at query time~~ — ELIMINATED. Based on factually wrong premise that routing decision log doesn't exist (R1-01). `WorkerDecisionEntry` already stores `trustScoreAtRouting`, `thresholdApplied`, and `routingRationale` (full `SelectionContext` JSON with selected candidate, all alternatives, scores, phases, and reasons).
- ~~Snapshot trust scores in case context~~ — ELIMINATED. Already done by the platform in `WorkerDecisionEntry`.
**Rationale:** `WorkerDecisionEventCapture` populates `routingRationale` with a JSON serialization of `SelectionContext` (strategyId, selected candidate, alternatives) at worker decision time. The REST endpoint deserializes this JSON, enriches with agent display names from `SocAgentDescriptors`, and returns it as `RoutingRationaleData` for `blocks-routing-rationale`. At-routing-time trust scores are available in `trustScoreAtRouting` — no reconstruction needed, no trade-off.
**Trade-offs:** Entries created before `routingRationale` was added will have null — fallback to showing the worker decision without rationale detail. Progressive enhancement.
**Sources:** `WorkerDecisionEntry.java` — fields: `trustScoreAtRouting`, `thresholdApplied`, `routingRationale`; `SelectionContext.java` — record: `strategyId`, `selected`, `alternatives`
**Exploration:** deep-analysis
**Status:** revised (R1-01, R1-07)

## Review Findings Resolved

| Finding | Resolution |
|---|---|
| R1-01: D7 premise wrong — routing decision log exists | D7 revised: use WorkerDecisionEntry.routingRationale directly |
| R1-02: Use blocks-routing-rationale, not new component | D6 revised: use blocks-routing-rationale with full CandidateScore |
| R1-03: Implicit decision to abandon blocks-trust-workbench | D1 revised: use blocks-trust-workbench for drill-down section |
| R1-04: Use blocks-similarity-panel, not new component | D5 revised: thin SOC wrapper around blocks-similarity-panel |
| R1-05: Use blocks-trust-score-panel for fleet | D3 revised: 6 trust-score-panel instances in CSS grid |
| R1-06: SSE event name wrong | D4 revised: use TrustScoreActorUpdatedEvent |
| R1-07: D6→D7 cascade failure | D6, D7 both revised — cascade eliminated |
| R1-08: D7 should have been deep exploration | Accepted — D7 now marked deep-analysis |
| R1-09: Implicit decisions not debated | All resolved via D1, D3, D5, D6 revisions |
