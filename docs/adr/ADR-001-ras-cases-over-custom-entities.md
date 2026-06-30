# ADR-001: Use RAS + Cases instead of custom alert/incident entities

**Date:** 2026-06-30
**Status:** Accepted
**Branch:** epic-1-domain-model
**Issue:** #7

## Context

The initial Epic 1 design created SOC-specific entity types that mirrored platform capabilities:

- `SecurityAlert` record — reimplemented CloudEvent data extraction
- `SecurityAlertEntity` / JPA — reimplemented what `CaseContext` stores
- `AlertIngestionResource` — reimplemented `platform-streams-webhook` WebhookResource
- `AlertCloudEventObserver` — reimplemented what RAS `SituationEvaluator` does
- `Incident` / `IncidentStatus` — reimplemented `CaseInstance` / `CaseStatus`

Each added a translation layer between the platform concept and a SOC-specific mirror with no additional semantics.

## Decision

SOC does not create custom entity types for alerts, incidents, or cases. Instead:

- **Alerts** are CloudEvents routed to Ganglion detectors via RAS. No app-level alert record.
- **Incidents** are CaseInstances created by RAS situation triggers. No app-level incident entity.
- **Investigation state** lives in CaseContext (key-value store). No app-level JPA persistence.
- **Alert reception** uses the platform webhook (`platform-streams-webhook`). No app-level REST endpoint.

The app layer provides:
1. **Domain vocabulary** — typed enums and records for SOC concepts (AlertSeverity, IocType, AttackTactic, SocActionType)
2. **Detection logic** — Ganglion implementations that classify cybersecurity events
3. **Risk classification** — ActionRiskClassifier governing containment actions
4. **Declarative workflow** — YAML for situation definitions and case definitions

## Consequences

### Positive
- No translation layer between platform and SOC concepts
- Platform handles CloudEvent routing, case lifecycle, audit trail, and persistence
- App layer is thin — only genuinely SOC-specific logic
- Consistent with platform design philosophy: apps pressure-test the foundation

### Negative
- SOC is the first RAS consumer — discovered that `SituationStore` has no implementation (platform gap)
- No app-level control over alert persistence schema (CaseContext is schemaless)
- Case definition YAML is the only way to express investigation workflow — no programmatic override

### Neutral
- Domain vocabulary types (AlertSeverity, IocType, AttackTactic, etc.) survive as content types for CaseContext and Ganglion evidence — they earn their existence through domain semantics, not infrastructure

## Alternatives Considered

### Keep custom entities alongside platform types
Rejected: every SOC entity would need bidirectional mapping to/from platform equivalents. The mapping code would be larger than the domain logic.

### Use platform types directly with no SOC domain types at all
Rejected: SOC needs typed vocabularies (AlertSeverity with `isActionable()`, SocActionType with gate policies, AttackTactic with MITRE taxonomy). Raw strings lose domain semantics.
