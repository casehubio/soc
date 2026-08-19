## D1: Timestamp source for IncidentSummaryDto.createdAt

**Choice:** Use `CaseInstance.getCreatedAt()` — the new per-instance creation timestamp added in engine#919.
**Alternatives:**
- Store `createdAt` in case context — works around a platform gap instead of fixing it; context keys are for domain data, not structural metadata
- Query first EventLog entry — correct per-instance but N+1 query for list operations; unnecessary complexity now that the platform exposes the field
- Use `CaseMetaModel.getCreatedAt()` — semantically wrong; that's the definition deployment time, not instance creation time
**Rationale:** The platform now provides the correct timestamp directly on CaseInstance. No workarounds needed.
**Trade-offs:** Requires engine SNAPSHOT to be current (already on 0.2-SNAPSHOT).
**Sources:** engine#919, CaseInstance.java:206-210, SocIncidentResource.java:103
**Exploration:** quick
**Status:** captured
