package io.casehub.soc.engine;

import io.casehub.ledger.api.model.ErasureReason;
import io.casehub.ledger.core.merkle.InclusionProof;
import io.casehub.ledger.runtime.privacy.LedgerErasureService;

import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PathParam;
import io.casehub.platform.api.mcp.PlatformMutation;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.soc.domain.ComplianceRequirement;
import io.casehub.soc.domain.DoraResponseTimeReport;
import io.casehub.soc.domain.ErasureResponse;
import io.casehub.soc.domain.SocStepType;
import io.casehub.soc.engine.compliance.PagedAuditEntries;
import io.casehub.soc.engine.compliance.SocComplianceService;
import io.casehub.soc.engine.compliance.SocLedgerEntry;
import io.casehub.soc.rest.dto.ErasureRequest;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.QueryParam;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@McpDomain(value = "soc/compliance", basePath = "/api/soc/compliance")
@ApplicationScoped
@RolesAllowed("soc-compliance-viewer")
public class SocComplianceApi {

    @Inject SocComplianceService service;
    @Inject CurrentPrincipal currentPrincipal;
    @Inject LedgerErasureService erasureService;

    private static final Map<String, ErasureReason> REASON_MAP = Map.ofEntries(
        Map.entry("GDPR_ART_17_REQUEST", ErasureReason.GDPR_ART_17_REQUEST),
        Map.entry("GDPR Art.17 Request", ErasureReason.GDPR_ART_17_REQUEST),
        Map.entry("RETENTION_EXPIRED", ErasureReason.RETENTION_EXPIRED),
        Map.entry("Data Retention Policy", ErasureReason.RETENTION_EXPIRED),
        Map.entry("ACCOUNT_DELETION", ErasureReason.ACCOUNT_DELETION),
        Map.entry("Account Deletion", ErasureReason.ACCOUNT_DELETION));

    @PlatformQuery("Get Merkle inclusion proof for a ledger entry")
    @RestPath("/proof/{entryId}")
    public InclusionProof getProof(@PathParam UUID entryId) {
        return service.inclusionProof(entryId, currentPrincipal.tenancyId());
    }

    @PlatformQuery("Get compliance timeline for an incident")
    @RestPath("/timeline/{incidentId}")
    public List<SocLedgerEntry> getTimeline(@PathParam UUID incidentId) {
        return service.incidentTimeline(incidentId, currentPrincipal.tenancyId());
    }

    @PlatformQuery("Get DORA response time report")
    @RestPath("/dora")
    public DoraResponseTimeReport getDoraReport(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to) {
        return service.doraReport(from, to, currentPrincipal.tenancyId());
    }

    @PlatformQuery("Get filtered audit entries")
    @RestPath("/entries")
    public PagedAuditEntries getEntries(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to,
            @QueryParam("stepType") SocStepType stepType,
            @QueryParam("actorId") String actorId,
            @QueryParam("incidentId") UUID incidentId,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("50") int size) {
        Instant effectiveFrom = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant effectiveTo = to != null ? to : Instant.now();
        int effectivePage = Math.max(0, page);
        int effectiveSize = Math.min(Math.max(size, 1), 200);
        return service.filteredEntries(effectiveFrom, effectiveTo, stepType, actorId,
            incidentId, effectivePage, effectiveSize, currentPrincipal.tenancyId());
    }

    @PlatformQuery("Get distinct actors from audit entries")
    @RestPath("/entries/actors")
    public List<String> getDistinctActors(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to) {
        Instant effectiveFrom = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant effectiveTo = to != null ? to : Instant.now();
        return service.distinctActors(effectiveFrom, effectiveTo, currentPrincipal.tenancyId());
    }

    @PlatformQuery("Get compliance requirement summary")
    @RestPath("/summary")
    public List<ComplianceRequirement> getSummary(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to) {
        Instant effectiveFrom = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant effectiveTo = to != null ? to : Instant.now();
        return service.complianceSummary(effectiveFrom, effectiveTo, currentPrincipal.tenancyId());
    }

    @PlatformMutation("Request GDPR erasure for a subject")
    @RestPath("/erasure")
    @RolesAllowed("soc-compliance-admin")
    public ErasureResponse requestErasure(ErasureRequest request) {
        if (request.subjectId() == null || request.subjectId().isBlank()) {
            throw new BadRequestException("subjectId is required");
        }
        ErasureReason reason = REASON_MAP.get(request.reason());
        if (reason == null) {
            throw new BadRequestException("Unknown erasure reason: " + request.reason());
        }
        LedgerErasureService.ErasureResult result =
            erasureService.erase(request.subjectId(), reason);
        return new ErasureResponse(
            result.receiptEntryId().map(UUID::toString).orElse(null),
            result.mappingFound() ? "WITHDRAWN" : "ALREADY_WITHDRAWN",
            Instant.now().toString(),
            result.affectedEntryCount());
    }
}
