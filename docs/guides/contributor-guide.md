# casehub-soc — Contributor Guide

> Internals, architecture, and extension points for platform contributors working on the Security Operations Center application.

**GitHub:** [casehubio/soc](https://github.com/casehubio/soc)

---

## Internal Architecture

### Layering Rule

If the capability requires knowledge of cybersecurity, threat intelligence, incident response, or compliance frameworks (SOC2, DORA, NIS2), it belongs here. If it is purely about cases, commitments, trust, or audit records, it belongs in the foundation. Never re-implement foundation primitives here.

### Module Details

| Module | Type | Purpose |
|---|---|---|
| `casehub-soc-api` | Pure-Java SPI (no Quarkus) | Domain model, SPI interfaces, capability tags |
| `casehub-soc-app` | Quarkus application | REST resources, JPA entities, foundation wiring, case plan models |

Follows the standard CaseHub module tier structure: pure-Java SPI in api/, JPA + Quarkus in app/.

### Design Philosophy

1. **CBR (Case-Based Reasoning)** — incident triage designed as a CBR system from day one. Past incidents feed future triage. Uses `CaseRetriever` SPI. Plans for Retrieve/Reuse/Revise/Retain.
2. **casehub-blocks** — SOC patterns (approval gate for containment, debate for threat assessment, escalation for analyst review) designed as blocks candidates. Implement locally first, then propose extraction to blocks.
3. **AI fusion** — SPIs allow LLM-powered and rule-based agents to coexist with the same trust model. Threat narrative synthesis, automated IOC correlation, natural language incident summaries.
4. **Platform extension** — if SOC needs something the platform doesn't have, file it as a parent issue. Push the platform forward; don't work around gaps silently.
5. **Pages UI** — SOC application UI via casehub-pages. Incident timeline, agent trust scores, channel activity, case status, threat heat maps. `hostPanel()` for custom SOC-specific components; DSL for data-bound visualizations.

---

## Depended On By

None currently — casehub-soc is a leaf application.

---

## Current State

Scaffold — Maven structure, documentation, workspace ready. No implementation yet.

Domain research and design phase is the immediate next step.

---

## Design Documents

- `CLAUDE.md` — project conventions and design philosophy
- `docs/DOMAIN.md` — full domain background: what a SOC is, the three-tier agent model, MITRE ATT&CK, incident response lifecycle, key entities, compliance frameworks, competitive landscape, and research directions
- `docs/NEXT-STEPS.md` — immediate implementation priorities
- `docs/PLATFORM-INVENTORY.md` — platform capability inventory for SOC
