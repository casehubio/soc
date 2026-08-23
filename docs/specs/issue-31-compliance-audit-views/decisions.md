## D1: Audit trail viewer data source

**Choice:** Cross-incident filterable endpoint
**Alternatives:**
- Incident picker + existing /timeline/{incidentId} — forces auditors to know which incident they want; defeats the compliance browsing use case
- Dual mode (global + per-incident toggle) — marginal benefit since global endpoint with incidentId filter achieves the same
**Rationale:** Auditors need to browse all investigation entries across incidents, filtered by date range, step type, actor, and optionally incident. A single `GET /api/soc/compliance/entries` with optional filters reuses existing `SocLedgerEntryRepository` queries and adds a combined filterable query with pagination.
**Trade-offs:** Requires a new combined query method in the repository; the existing per-incident `/timeline/{incidentId}` endpoint remains for incident-detail use cases
**Sources:** `SocLedgerEntryRepository.java` (existing queries: findByIncidentId, findByTimeRange, findByStepType), `SocComplianceResource.java` (existing endpoints), issue-21 compliance design spec
**Exploration:** quick
**Status:** captured

## D2: Compliance summary computation model

**Choice:** Ledger-derived rules per compliance framework
**Alternatives:**
- Configurable checklist with manual status marking — introduces driftable manual state, contradicts automated evidence goal
- DORA only, defer SOC2/NIS2 — spec explicitly calls for all three, and the ledger data to compute them already exists
**Rationale:** Each framework is a set of named checks computed from ledger data. DORA: SLA compliance % from DoraResponseTimeReport. SOC2: % of CONTAINMENT_DECISION entries with approverId in metadata (authorisation gate enforcement). NIS2: % of incidents triaged within regulatory response windows. Results expressed as MET/PARTIAL/GAP/BREACHED badges per check.
**Trade-offs:** SOC2 and NIS2 checks are simplified proxies of complex regulatory requirements; real compliance needs human audit judgment. The badges are evidence summaries, not compliance certifications.
**Sources:** `SocComplianceService.java` (DORA computation pattern), `SocLedgerEntryWriter` validation table (compliance-critical fields per step type), issue-21 spec §9 DoraResponseTimeReport
**Exploration:** quick
**Status:** captured

## D3: GDPR erasure flow — use blocks-ui component

**Choice:** Use `blocks-gdpr-erasure-action` directly, drop the SOC preview query
**Alternatives:**
- SOC preview query + platform erase — designed before discovering the blocks-ui component; adds complexity for a feature the component handles naturally
- Wrapper with preview insertion — component wasn't designed for an intermediate step before its confirm dialog
**Rationale:** The `blocks-gdpr-erasure-action` component provides a complete flow: schema-driven form (subjectId + reason via `pages-schema-form`) → `pages-confirm-dialog` with danger styling → POST to endpoint → receipt display showing entryCount, status, timestamp. The receipt shows affected entry count after erasure. No preview endpoint needed — one REST endpoint: `POST /api/soc/compliance/erasure` accepting `{ subjectId, reason }`, delegating to `LedgerErasureService.erase()`.
**Depends on:** D4 (RBAC — erasure endpoint needs soc-compliance-admin)
**Trade-offs:** No pre-erasure count visibility. Acceptable because: (1) erasure is token-severing (identity mapping deleted), not data deletion — entries remain but become unlinkable; (2) the confirm dialog provides a safety gate; (3) the receipt shows the count immediately after
**Sources:** `blocks-ui/components/gdpr-erasure-action/src/gdpr-erasure-action.ts`, `LedgerErasureService.java`, `ErasureReason.java`
**Exploration:** quick
**Status:** revised (was: SOC preview query + platform erase)

## D4: RBAC for erasure endpoint

**Choice:** Separate `soc-compliance-admin` role for erasure
**Alternatives:**
- Same `soc-compliance-viewer` role — simpler role model, but allows anyone who can view data to execute irreversible erasures
**Rationale:** Principle of least privilege. Auditors browse and verify with `soc-compliance-viewer`. Only admins with `soc-compliance-admin` can execute GDPR erasure.
**Trade-offs:** Two roles to manage instead of one; trivial overhead for meaningful security boundary
**Sources:** `SocComplianceResource.java` (existing `@RolesAllowed("soc-compliance-viewer")`), issue-21 spec §10
**Exploration:** quick
**Status:** captured

## D5: Component strategy — maximise blocks-ui reuse

**Choice:** 2 blocks-ui components + 1 SOC component using pages primitives
**Alternatives:**
- 3 SOC-specific components — misses the blocks-ui components that already exist for compliance-summary and gdpr-erasure-action
- 3 blocks-ui components — blocks-audit-trail-viewer hardcodes `/api/v1/ledger/entries` URL pattern and requires single subjectId; incompatible with cross-incident SOC browsing
- Proxy endpoints matching platform URLs — creates confusing REST routing to work around component limitations
**Rationale:**
- `blocks-compliance-summary` — use directly with `endpoint="/api/soc/compliance/summary"`. Returns `RequirementDefinition[]` (`regulation, requirement, mechanism, status, evidenceUrl`). No SOC wrapper needed.
- `blocks-gdpr-erasure-action` — use directly with `endpoint="/api/soc/compliance/erasure"` and `reasonOptions` mapped to ErasureReason values. No SOC wrapper needed.
- Audit trail viewer — build `soc-audit-trail` using `pages-table`, `renderPropertyTree`, and the same visual patterns as `blocks-audit-trail-viewer`. SOC-specific: step type badges, cross-incident browsing, SOC endpoint URLs, incident grouping. Merkle verification via existing `/api/soc/compliance/proof/{entryId}` endpoint.
**Trade-offs:** One SOC-specific component instead of full blocks-ui reuse. The alternative (forking or proxying) creates worse maintenance burden.
**Sources:** `blocks-ui/components/audit-trail-viewer/src/audit-trail-viewer.ts` (URL hardcoding at line 156), `blocks-ui/components/compliance-summary/src/types.ts` (RequirementDefinition), `blocks-ui/components/gdpr-erasure-action/src/gdpr-erasure-action.ts` (built-in flow)
**Exploration:** quick
**Status:** captured
