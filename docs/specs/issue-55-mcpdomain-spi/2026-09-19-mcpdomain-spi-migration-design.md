# SOC @McpDomain SPI Migration Design

**Issue:** casehubio/soc#55
**Date:** 2026-09-19
**Branch:** issue-55-mcpdomain-spi

## Overview

Migrate 8 hand-written JAX-RS REST resources in `casehub-soc` to the
`@McpDomain` SPI pattern. The generator produces REST + GraphQL + MCP
registration from annotated concrete classes. Hand-written resources are
deleted after migration.

Pre-release — no production installations, no backwards compatibility
constraint. Response shapes are redesigned with proper typed DTOs.

## Annotation Pattern

Follows the AML migration (latest completed). All annotations from
`io.casehub.platform.api.mcp.*`:

```java
@McpDomain(value = "soc/incidents", basePath = "/api/soc/incidents")
@ApplicationScoped
public class SocIncidentApi {

    @PlatformQuery("List incidents with pagination")
    @RestPath("/")
    @PaginatedResponse(totalCountMethod = "totalIncidents")
    public List<IncidentSummaryResponse> listIncidents(
            @QueryParam("page") int page,
            @QueryParam("size") int size) { ... }
}
```

- `@PlatformQuery` → GET; `@PlatformMutation` → POST/PUT/DELETE
- `@RestPath` for path segments (appended to basePath)
- `@PathParam`, `@QueryParam` from `io.casehub.platform.api.mcp`
- `@PaginatedResponse` for paginated queries
- `@RolesAllowed` propagates to generated endpoints

## @McpDomain Class Grouping

7 classes, consolidated by domain. All basePaths are unique leaf paths
under `/api/soc/` — no shadowing risk.

### 1. SocIncidentApi — `soc/incidents`

**basePath:** `/api/soc/incidents`
**Merges:** SocIncidentResource + SocIocSubmissionResource
**Injects:** `CaseInstanceRepository`, `CurrentPrincipal`, `ChannelReader`

| Method | Type | RestPath | Returns |
|---|---|---|---|
| `listIncidents(page, size)` | Query | `/` | `List<IncidentSummaryResponse>` |
| `getIncident(id)` | Query | `/{id}` | `IncidentDetailResponse` |
| `getTimeline(id)` | Query | `/{id}/timeline` | `List<TimelineEntryResponse>` |
| `getChannels(id)` | Query | `/{id}/channels` | `List<ChannelResponse>` |
| `getIocs(id)` | Query | `/{id}/iocs` | `IocListResponse` |
| `getAttck(id)` | Query | `/{id}/attck` | `AttckMappingResponse` |
| `submitIoc(id, request)` | Mutation | `/{id}/iocs` | `IocSubmissionResponse` |

`totalIncidents()` — companion count method for `@PaginatedResponse`.

### 2. SocComplianceApi — `soc/compliance`

**basePath:** `/api/soc/compliance`
**Security:** `@RolesAllowed("soc-compliance-viewer")` on class
**Injects:** `SocComplianceService`, `CurrentPrincipal`, `LedgerErasureService`

| Method | Type | RestPath | Returns | Security |
|---|---|---|---|---|
| `getProof(entryId)` | Query | `/proof/{entryId}` | `InclusionProof` | class-level |
| `getTimeline(incidentId)` | Query | `/timeline/{incidentId}` | `List<SocLedgerEntry>` | class-level |
| `getDoraReport(from, to)` | Query | `/dora` | `DoraResponseTimeReport` | class-level |
| `getEntries(from, to, stepType, actorId, incidentId, page, size)` | Query | `/entries` | `PagedAuditEntries` | class-level |
| `getDistinctActors(from, to)` | Query | `/entries/actors` | `List<String>` | class-level |
| `getSummary(from, to)` | Query | `/summary` | `List<ComplianceRequirement>` | class-level |
| `requestErasure(request)` | Mutation | `/erasure` | `ErasureResponse` | `@RolesAllowed("soc-compliance-admin")` |

Already well-typed — only needs an `ErasureRequest` record to replace
the `Map<String,String>` body.

### 3. SocTrustApi — `soc/trust`

**basePath:** `/api/soc/trust`
**Injects:** `SocTrustService` (new — extracts inline logic)

| Method | Type | RestPath | Returns |
|---|---|---|---|
| `getAgentTrust(agentId)` | Query | `/{agentId}` | `AgentTrustResponse` |
| `getFleetKpis()` | Query | `/fleet-kpis` | `List<KpiResponse>` |
| `getRoutingRationale(caseId)` | Query | `/routing/{caseId}` | `List<RoutingDecisionResponse>` |

Heavy inline logic (candidate enrichment, phase classification, Jackson
deserialization, policy construction) moves to new `SocTrustService`.

### 4. SocCbrApi — `soc/cbr`

**basePath:** `/api/soc/cbr`
**Injects:** `SocCbrRetrieveService`, `CaseInstanceRepository`, `CurrentPrincipal`

| Method | Type | RestPath | Returns |
|---|---|---|---|
| `getSimilarIncidents(caseId)` | Query | `/similar/{caseId}` | `CbrSimilarResponse` |

Inline mapping logic (`toPrecedent()`, `computeSummary()`) moves to
`SocCbrRetrieveService` or a mapper.

### 5. SocAlertApi — `soc/alerts`

**basePath:** `/api/soc/alerts`
**Injects:** none (stub)

| Method | Type | RestPath | Returns |
|---|---|---|---|
| `getHeatmap(timeUnit, from, to)` | Query | `/heatmap` | `AlertHeatmapResponse` |

Currently a stub returning empty data. Migration types it properly;
implementation fills in later.

### 6. SocKpiApi — `soc/kpis`

**basePath:** `/api/soc/kpis`
**Injects:** `CaseInstanceRepository`, `CurrentPrincipal`

| Method | Type | RestPath | Returns |
|---|---|---|---|
| `getKpis()` | Query | `/` | `List<KpiResponse>` |

Partially stub (MTTR, P1 SLA are placeholders). Shares `KpiResponse`
with SocTrustApi fleet-kpis.

### 7. SocDemoApi — `soc/demo`

**basePath:** `/api/soc/demo`
**Security:** `@RolesAllowed("soc-demo-admin")`
**Injects:** `SituationEvaluator`, `SituationDefinitionRegistry`, `CurrentPrincipal`

| Method | Type | RestPath | Returns |
|---|---|---|---|
| `injectAlert(request)` | Mutation | `/inject-alert` | `AlertInjectionResponse` |

## DTO Model

All DTOs are Java records in `app/src/main/java/io/casehub/soc/rest/dto/`.
Domain types already in `api/` (`ComplianceRequirement`, `DoraResponseTimeReport`,
`ErasureResponse`, `InclusionProof`, `SocLedgerEntry`, `PagedAuditEntries`) are
reused directly — no wrapper DTOs for those.

### Incident DTOs

```java
// Existing — keep as-is
record IncidentSummaryResponse(UUID id, String status, String severity,
    String source, String title, Instant createdAt) {}

record IncidentDetailResponse(UUID id, String status, String severity,
    String source, String title, Instant createdAt,
    String description, String correlationKey,
    Map<String, Object> caseContext) {}

record TimelineEntryResponse(String action, String actor, Instant timestamp,
    String detail) {}

record ChannelResponse(String name, String description) {}

record IocListResponse(List<IocResponse> iocs) {}

record IocResponse(String type, String value, double confidence,
    String source, Instant firstSeen, List<String> tags) {}

record AttckMappingResponse(List<AttckTechniqueResponse> techniques) {}

record AttckTechniqueResponse(String techniqueId, String name,
    String tactic, double confidence) {}

record IocSubmissionRequest(String type, String value,
    Double confidence) {}

record IocSubmissionResponse(List<IocResponse> iocs) {}
```

### Trust DTOs

```java
record AgentTrustResponse(String agentId, String name,
    String capability, String agentType, double globalTrustScore,
    long decisionCount, Instant lastComputedAt,
    List<TrustDimensionResponse> dimensions) {}

record TrustDimensionResponse(String key, double score,
    long decisionCount) {}

record RoutingDecisionResponse(String capabilityTag, String strategyId,
    RoutingCandidateResponse selected,
    List<RoutingCandidateResponse> alternatives,
    RoutingPolicyResponse policy) {}

record RoutingCandidateResponse(String workerId, double trustScore,
    double workloadScore, String phase, long observations,
    double finalScore, String exclusionReason, String rationale,
    Map<String, Double> additionalScores) {}

record RoutingPolicyResponse(double threshold, double borderlineMargin,
    double blendFactor, int minimumObservations,
    Map<String, Double> qualityFloors, double cbrWeight,
    boolean bootstrapEscalationRequired) {}
```

### Shared DTOs

```java
record KpiResponse(String label, String value, String unit,
    String trend) {}
```

### CBR DTOs

```java
record CbrSimilarResponse(CbrSummaryResponse summary,
    List<CbrPrecedentResponse> incidents) {}

record CbrSummaryResponse(int totalSimilar,
    Map<String, Integer> outcomes, long avgResolutionMinutes,
    String dominantOutcome, double dominantOutcomePercent) {}

record CbrPrecedentResponse(UUID caseId, double similarity,
    String outcome, String resolutionTime, String alertType,
    String sourceSystem, List<String> attckTechniqueIds,
    String playbook) {}
```

### Alert DTOs

```java
record AlertHeatmapResponse(List<HeatmapCell> cells,
    List<String> sources, List<String> severities) {}

record HeatmapCell(String source, String severity,
    String timeUnit, int count) {}
```

### Demo DTOs

```java
record AlertInjectionRequest(String eventType, String severity,
    String source, String rule, String correlationKey) {}

record AlertInjectionResponse(String situationId, String eventId,
    String correlationKey, boolean evaluated) {}
```

### Compliance DTOs

```java
record ErasureRequest(String actorId, String reason) {}
```

## New Service: SocTrustService

Extracts inline logic from `SocTrustResource`:

```java
@ApplicationScoped
public class SocTrustService {
    AgentTrustResponse getAgentTrust(String agentId, String tenancyId);
    List<KpiResponse> getFleetKpis(String tenancyId);
    List<RoutingDecisionResponse> getRoutingRationale(UUID caseId, String tenancyId);
}
```

Encapsulates: agent descriptor lookup, trust score fetching, dimension
scoring, candidate enrichment, phase classification, Jackson
deserialization of routing rationale, policy construction.

## Files to Delete After Migration

All hand-written REST resources under `app/.../rest/`:

- `SocAlertResource.java`
- `SocCbrResource.java`
- `SocComplianceResource.java`
- `SocDemoResource.java`
- `SocIncidentResource.java`
- `SocIocSubmissionResource.java`
- `SocKpiResource.java`
- `SocTrustResource.java`

**Keep:**
- `SimulatedContainmentConnector.java` — not under `/api/soc/`
- `SocIncidentPushService.java` — CDI observer, no endpoints
- `SocTrustPushService.java` — CDI observer, no endpoints
- `SocPushProducers.java` — CDI producers

**Rename existing DTO:**
- `IncidentSummaryResponse` → `IncidentSummaryResponse` (naming alignment)

## Non-Goals

- SSE/streaming endpoints — none exist in SOC
- GraphQL customization — generator handles this
- New endpoint functionality — migration only, no new features
- Service refactoring beyond what's needed to extract inline logic

## Migration Order

1. Create DTOs (no dependencies, compile immediately)
2. Create `SocTrustService` (extracts inline logic)
3. Create @McpDomain classes (depend on DTOs + services)
4. Delete hand-written REST resources
5. Update tests to use generated endpoints
6. Verify build + all tests pass

## References

- AML @McpDomain migration — `casehubio/aml#130` (completed pattern)
- AML basePath shadowing lesson — slot 194 HANDOFF.md
- Platform strategy — `casehubio/platform#295`
- `io.casehub.platform.api.mcp.*` annotation package
