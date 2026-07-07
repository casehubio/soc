# soc Workspace

**Name:** casehub-soc

**Physical path:** `/Users/mdproctor/claude/casehub/soc/CLAUDE.md`
**Symlinked at:** `/Users/mdproctor/claude/public/casehub/soc/CLAUDE.md`
**Project repo:** `/Users/mdproctor/claude/casehub/soc`
**Workspace:** `/Users/mdproctor/claude/public/casehub/soc`
**Workspace type:** public

## Session Start

Run `add-dir /Users/mdproctor/claude/casehub/soc` before any other work.

## Artifact Locations

| Skill | Writes to |
|-------|-----------|
| brainstorming (specs) | `specs/` |
| writing-plans (plans) | `plans/` |
| handover | `HANDOFF.md` |
| idea-log | `IDEAS.md` |
| design-snapshot | `snapshots/` |
| java-update-design / update-primary-doc | `design/JOURNAL.md` (created by `epic`) |
| adr | `adr/` |
| write-blog | `blog/` |

## Structure

- `HANDOFF.md` — session handover (single file, overwritten each session)
- `IDEAS.md` — idea log (single file)
- `specs/` — brainstorming / design specs (superpowers output)
- `plans/` — implementation plans (superpowers output)
- `snapshots/` — design snapshots with INDEX.md (auto-pruned, max 10)
- `adr/` — architecture decision records with INDEX.md
- `blog/` — project diary entries with INDEX.md
- `design/` — epic journal (created by `epic` at branch start)

## Git Discipline

Two git repositories are active in every session: a **workspace** (methodology artifacts: handover, blog, specs, plans, ADRs) and the **project repo** (source code).

Before any git operation, run `git rev-parse --show-toplevel` to confirm which repo is currently active. Do not assume — the session may have opened in either. cd to the correct repo before staging:
- Source code commits → project repo
- Methodology artifacts → workspace

**Pre-push hook (`core.hooksPath = .githooks`):** The project repo has a hook that blocks all pushes containing commits — including empty ones. All `chore: branch closed` stamps require `--no-verify` on push, regardless of whether the branch has an existing remote upstream. See garden entry GE-20260531-2f51fd for root cause detail.

## Rules

- All methodology artifacts go here, not in the project repo
- Promotion to project repo is always explicit — never automatic
- Workspace branches mirror project branches — switch both together

## Routing

| Artifact   | Destination | Notes |
|------------|-------------|-------|
| adr        | project     | lands in `docs/adr/` — promoted at epic close |
| specs      | project     | lands in `docs/specs/` — promoted at epic close |
| blog       | workspace   | staged here; published to mdproctor.github.io via publish-blog |
| plans      | workspace   | stay in workspace permanently |
| design     | workspace   | epic journal stays in workspace |
| snapshots  | workspace   | stay in workspace permanently |
| handover   | workspace   | |

---

# casehub-soc — Claude Code Project Guide

## Platform Context

This repo is one component of the casehubio multi-repo platform. **Before implementing anything — any feature, SPI, data model, or abstraction — run the Platform Coherence Protocol.**

> **Platform docs:** Local paths use `../parent/docs/` as root. If a path doesn't exist, the parent repo isn't cloned locally — fetch from `https://raw.githubusercontent.com/casehubio/parent/main/docs/<path>` instead.

The protocol asks: Does this already exist elsewhere? Is this the right repo for it? Does this create a consolidation opportunity? Is this consistent with how the platform handles the same concern in other repos?

## Platform Docs
- [Platform Index](https://raw.githubusercontent.com/casehubio/parent/main/docs/INDEX.md) — discovery index (start here)
- [Building Apps](https://raw.githubusercontent.com/casehubio/parent/main/docs/guides/building-apps.md) — app developer guide with cross-app patterns
- [This repo's deep-dive](https://raw.githubusercontent.com/casehubio/parent/main/docs/repos/casehub-soc.md)

**Use IntelliJ MCP to browse peer repo source code directly.** When designing SPIs, domain model, or integration patterns, use `mcp__intellij-index__ide_find_class`, `ide_find_references`, `ide_type_hierarchy` etc. to see exactly how other repos (especially casehub-aml, casehub-clinical, casehub-life) implement the same foundation patterns. Copy proven patterns — don't invent parallel approaches.

---

## Project Type

type: java

**Stack:** Java 21 (on Java 26 JVM), Quarkus 3.32.2, GraalVM 25 (native image target)

---

## Session Start

Read `AGENTIC-HARNESS-GUIDE.md` at session start alongside this CLAUDE.md.
Path: `../parent/docs/AGENTIC-HARNESS-GUIDE.md`

---

## What This Project Is

`casehub-soc` is the **Security Operations Center** application built on the CaseHub platform foundation.

**Full domain background — read first:** [`docs/DOMAIN.md`](docs/DOMAIN.md) — what a SOC is, the three-tier agent model, MITRE ATT&CK, incident response lifecycle, key entities, compliance frameworks (SOC2, DORA, NIS2), competitive landscape, and research directions. That document gives a new session everything it needs to start researching and designing without external reading.

This is an **application layer**, not a framework. The foundation provides coordination, accountability, audit, and compliance primitives. casehub-soc provides the cyber incident response domain logic on top.

### Design Philosophy — Be Bold, Be Adventurous

**Do not limit design to what CaseHub provides today.** Design for what the platform is becoming:

1. **CBR (Case-Based Reasoning)** — design incident triage as a CBR system from day one. Past incidents feed future triage. Use `CaseRetriever` SPI even though the RAG pipeline is still maturing. Plan for Retrieve/Reuse/Revise/Retain. Read `../parent/docs/CBR-CAPABILITY.md`.

2. **casehub-blocks** — the reusable building blocks repo is being created. Design SOC patterns (approval gate for containment, debate for threat assessment, escalation for analyst review) as blocks candidates. Implement them locally first, then propose extraction to blocks.

3. **AI fusion** — think beyond rule-based agents. Where can LLM agents add value? Threat narrative synthesis? Automated IOC correlation? Natural language incident summaries? Design SPIs that allow LLM-powered and rule-based agents to coexist with the same trust model.

4. **Propose new platform capabilities.** If SOC needs something the platform doesn't have, file it as a parent issue. Examples: real-time streaming event correlation (casehub-ras), temporal pattern detection (Drools CEP integration), automated playbook execution. Push the platform forward — don't work around gaps silently.

5. **Pages UI** — design the SOC application UI using casehub-pages. Incident timeline, agent trust scores, channel activity, case status, threat heat maps. Use `hostPanel()` for custom SOC-specific components; use the DSL for data-bound visualizations. Pages is embedded via iframe — design the data contracts (datasets) and panel layout that the application will consume. Drive requirements upstream if SOC needs primitives casehub-pages doesn't have yet.

### Platform Coherence is Critical

**Consistency with the platform is not optional.** Every pattern, convention, and naming decision must align with the foundation. Before implementing anything:
1. Read PLATFORM.md — understand capability ownership and boundary rules
2. Use IntelliJ MCP to browse peer repos — see how they solve the same problem
3. Follow the module tier structure — pure-Java SPI in api/, JPA + Quarkus in app/
4. Follow the CDI displacement pattern — @DefaultBean mocks, @Alternative overrides
5. Follow naming conventions — check garden protocols

---

## Accountability Properties Delivered

| Compliance requirement | Without casehub-soc | With casehub-soc |
|---|---|---|
| Auditable incident response chain | Append-only SIEM logs; no decision attribution | Commitment per agent task; `causedByEntryId` chains the full investigation |
| Human authorization for containment | Ad-hoc Slack approval; no formal gate | WorkItem with oversight gate; `ActionRiskClassifier` gates containment actions |
| SOC2 / DORA compliance evidence | Manual compliance reports | Merkle inclusion proofs; tamper-evident response record |
| Trust-weighted analyst routing | Round-robin or manual assignment | Bayesian Beta from incident resolution attestations |
| Incident knowledge retention | Tribal knowledge; runbooks rot | CBR: past incidents automatically inform future triage |
| Response time SLA enforcement | Alert fatigue; missed deadlines | `SlaBreachPolicy` with escalation chain to SOC manager |

---

## Layering Rule

This is an application, not a framework. If the capability requires knowledge of cybersecurity, threat intelligence, incident response, or compliance frameworks (SOC2, DORA, NIS2), it belongs here. If it is purely about cases, commitments, trust, or audit records, it belongs in the foundation. Never re-implement foundation primitives here.

---

## Build Commands

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode install
JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode install -DskipTests
```

Use `mvn` not `./mvnw` — maven wrapper not configured on this machine.

---

## Ecosystem Conventions

**Quarkus version:** 3.32.2. When bumping, bump all projects together.

**GitHub Packages:**
```xml
<repository>
  <id>github</id>
  <url>https://maven.pkg.github.com/casehubio/*</url>
  <snapshots><enabled>true</enabled></snapshots>
</repository>
```

**Java:** `JAVA_HOME=$(/usr/libexec/java_home -v 26)`

**Multi-module test scoping:** Always scope Maven with `-pl <module> -am`. Add `-Dsurefire.failIfNoSpecifiedTests=false` when combining `-am` with `-Dtest=ClassName`.

---

## Development Workflow

Before designing: `superpowers:brainstorming`
Before implementing: `superpowers:test-driven-development`
Before committing: `superpowers:requesting-code-review`

## Peer Repos — Hard Boundary

**Never commit or push to peer repo directories.** Each repo has its own Claude session. For cross-repo fixes, create a GitHub issue on the target repo instead.

Peer repos: platform, eidos, ledger, connectors, iot, work, worker, qhorus, pages, engine, claudony, openclaw, neural-text, devtown, aml, clinical, drafthouse, life, quarkmind, flow, desiredstate, fsitrading

## Project Artifacts

Paths that are project content (not workspace noise). Skills use this to avoid
filtering or dropping commits that touch these paths.

| Path | What it is |
|------|------------|
| `CLAUDE.md` | Project conventions |
| `docs/` | Domain background, specs, ADRs |

## Work Tracking

**Issue tracking:** enabled
**GitHub repo:** casehubio/soc

**Automatic behaviours:**
- Before implementation begins — check for an active issue. If none, run issue-workflow Phase 1 before writing any code.
- Every issue must be linked to its parent epic — no orphan issues.
- Before any commit — confirm issue linkage.
- All commits reference an issue — `Refs #N` or `Closes #N`. No commit may be made without an issue reference.

## IntelliJ MCP Routing

One IntelliJ MCP server is available:

- **`mcp__intellij-index__*`** — use this for ALL code intelligence and navigation. Supports auto-opening projects via `project_path`. Pass `project_path` to auto-open any closed project — never ask the user to open a project manually.

`mcp__intellij__*` (built-in JetBrains MCP) is **disabled** due to a memory leak. Do not attempt to use it. All operations (find class, find references, type hierarchy, diagnostics, rename, move) go through `mcp__intellij-index__*`.

## Writing Style Guide

**The writing style guide at `~/claude-workspace/writing-styles/blog-technical.md` is mandatory for all blog and diary entries.** Load it in full before drafting.
