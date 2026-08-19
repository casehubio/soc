# Fix IncidentSummaryDto.createdAt — use real instance creation timestamp

**Issue:** casehubio/soc#32
**Date:** 2026-08-18

## Problem

`SocIncidentResource.toSummary()` passes `Instant.now()` to the `createdAt` field of `IncidentSummaryDto`. The timestamp changes on every API call instead of reflecting when the incident was actually created.

## Investigation findings

`CaseInstance` had no creation timestamp. The three candidates listed in the issue were:

1. **Case context key** — no `createdAt` key is set during incident creation
2. **CaseLifecycleEvent** — carries no timestamp field
3. **EventLog** — has per-event timestamps, but querying the first event per case is an N+1 problem for list endpoints

The root cause was a platform gap: `CaseInstance` should carry its own creation timestamp. Filed engine#919, which has landed — `CaseInstance` now has `createdAt` (field, getter, setter) set at case start time.

## Fix

Replace `Instant.now()` with `ci.getCreatedAt()` in `SocIncidentResource.toSummary()`.

The `import java.time.Instant` can be removed since `IncidentSummaryDto` already imports it and `toSummary()` no longer references `Instant` directly.

## Test

Add a test that creates an incident case, calls the list endpoint, and verifies `createdAt` is stable across two calls (not `Instant.now()`).

## References

- engine#919 — Add createdAt timestamp to CaseInstance
- `SocIncidentResource.java:95-104` — the `toSummary()` method with the bug
- `IncidentSummaryDto.java:6-12` — the record definition
- `CaseInstance.java:206-210` — the new `createdAt` field (engine)
- `CaseInstanceResponse.java:49` — engine's own DTO also used `meta.getCreatedAt()` (fixed in #919)
