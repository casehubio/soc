# casehub-soc — Consumer Guide

> Security Operations Center application — multi-agent cyber incident response with trust-weighted triage, CBR-based incident correlation, and compliance evidence for SOC2, DORA, and NIS2.

**GitHub:** [casehubio/soc](https://github.com/casehubio/soc)
**Tier:** Application

---

## Purpose

Multi-agent cyber incident response built on the CaseHub platform foundation. Exercises every CaseHub primitive: qhorus channels map to the 3-tier SOC model (core ops / intelligence / orchestration), trust scoring evolves as agents prove accuracy, CBR from past incidents feeds triage, oversight gates authorize irreversible containment, commitment lifecycle enforces response SLA, audit ledger provides tamper-evident compliance trail.

This is an **application layer**, not a framework. The foundation provides coordination, accountability, audit, and compliance primitives. casehub-soc provides the cyber incident response domain logic on top.

---

## Module Structure

| Module | Type | Purpose |
|---|---|---|
| `casehub-soc-api` | Pure-Java SPI (no Quarkus) | Domain model, SPI interfaces, capability tags |
| `casehub-soc-app` | Quarkus application | REST resources, JPA entities, foundation wiring, case plan models |

---

## Accountability Properties

| Compliance requirement | Without casehub-soc | With casehub-soc |
|---|---|---|
| Auditable incident response chain | Append-only SIEM logs; no decision attribution | Commitment per agent task; `causedByEntryId` chains the full investigation |
| Human authorization for containment | Ad-hoc Slack approval; no formal gate | WorkItem with oversight gate; `ActionRiskClassifier` gates containment actions |
| SOC2 / DORA compliance evidence | Manual compliance reports | Merkle inclusion proofs; tamper-evident response record |
| Trust-weighted analyst routing | Round-robin or manual assignment | Bayesian Beta from incident resolution attestations |
| Incident knowledge retention | Tribal knowledge; runbooks rot | CBR: past incidents automatically inform future triage |
| Response time SLA enforcement | Alert fatigue; missed deadlines | `SlaBreachPolicy` with escalation chain to SOC manager |

---

## Dependencies

- **casehub-platform** — core case management, commitment lifecycle, trust scoring
- **casehub-eidos** — domain model primitives
- **casehub-ledger** — tamper-evident audit trail, Merkle inclusion proofs
- **casehub-qhorus** — multi-agent channel coordination (3-tier SOC model)
- **casehub-engine** — CBR case retrieval, planning

---

## What It Does NOT Do

- **Framework concerns** — cases, commitments, trust, audit records belong in the foundation, not here
- **Generic coordination** — channel management, agent orchestration, oversight gates are platform primitives
- **SIEM replacement** — ingests SIEM events but does not replace log collection or storage
- **Rule engine** — uses platform capabilities (Drools CEP integration when available) rather than reimplementing pattern detection
