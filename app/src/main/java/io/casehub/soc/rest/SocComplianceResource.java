package io.casehub.soc.rest;

import io.casehub.ledger.api.model.ErasureReason;
import io.casehub.ledger.runtime.privacy.LedgerErasureService;
import io.casehub.ledger.runtime.service.model.InclusionProof;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.soc.domain.ComplianceRequirement;
import io.casehub.soc.domain.DoraResponseTimeReport;
import io.casehub.soc.domain.ErasureResponse;
import io.casehub.soc.domain.SocStepType;
import io.casehub.soc.engine.compliance.PagedAuditEntries;
import io.casehub.soc.engine.compliance.SocComplianceService;
import io.casehub.soc.engine.compliance.SocLedgerEntry;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/soc/compliance")
@ApplicationScoped
@RolesAllowed("soc-compliance-viewer")
public class SocComplianceResource {

    @Inject SocComplianceService service;
    @Inject CurrentPrincipal currentPrincipal;
    @Inject
            LedgerErasureService erasureService;


    @GET @Path("/proof/{entryId}")
    public InclusionProof getProof(@PathParam("entryId") UUID entryId) {
        return service.inclusionProof(entryId, currentPrincipal.tenancyId());
    }

    @GET @Path("/timeline/{incidentId}")
    public List<SocLedgerEntry> getTimeline(@PathParam("incidentId") UUID incidentId) {
        return service.incidentTimeline(incidentId, currentPrincipal.tenancyId());
    }

    @GET @Path("/dora")
    public DoraResponseTimeReport getDoraReport(
            @QueryParam("from") Instant from, @QueryParam("to") Instant to) {
        return service.doraReport(from, to, currentPrincipal.tenancyId());
    }

    @GET
    @Path("/entries")
    public PagedAuditEntries getEntries(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to,
            @QueryParam("stepType") SocStepType stepType,
            @QueryParam("actorId") String actorId,
            @QueryParam("incidentId") UUID incidentId,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("50") int size) {
        Instant effectiveFrom = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant effectiveTo   = to != null ? to : Instant.now();
        int effectivePage = Math.max(0, page);
        int effectiveSize = Math.min(Math.max(size, 1), 200);
        return service.filteredEntries(effectiveFrom, effectiveTo, stepType, actorId, incidentId,
                                       effectivePage, effectiveSize, currentPrincipal.tenancyId());
    }

    @GET
    @Path("/entries/actors")
    public List<String> getDistinctActors(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to) {
        Instant effectiveFrom = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant effectiveTo   = to != null ? to : Instant.now();
        return service.distinctActors(effectiveFrom, effectiveTo, currentPrincipal.tenancyId());
    }

    @GET
    @Path("/summary")
    public List<ComplianceRequirement> getSummary(
            @QueryParam("from") Instant from,
            @QueryParam("to") Instant to) {
        Instant effectiveFrom = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant effectiveTo   = to != null ? to : Instant.now();
        return service.complianceSummary(effectiveFrom, effectiveTo, currentPrincipal.tenancyId());
    }

    private static final Map<String, ErasureReason> REASON_MAP = Map.ofEntries(
            Map.entry("GDPR_ART_17_REQUEST", ErasureReason.GDPR_ART_17_REQUEST),
            Map.entry("GDPR Art.17 Request", ErasureReason.GDPR_ART_17_REQUEST),
            Map.entry("RETENTION_EXPIRED", ErasureReason.RETENTION_EXPIRED),
            Map.entry("Data Retention Policy", ErasureReason.RETENTION_EXPIRED),
            Map.entry("ACCOUNT_DELETION", ErasureReason.ACCOUNT_DELETION),
            Map.entry("Account Deletion", ErasureReason.ACCOUNT_DELETION));

    @POST
    @Path("/erasure")
    @RolesAllowed("soc-compliance-admin")
    public ErasureResponse postErasure(Map<String, String> body) {
        String rawActorId = body.get("subjectId");
        if (rawActorId == null || rawActorId.isBlank()) {
            throw new BadRequestException("subjectId is required");
        }
        String reasonStr = body.get("reason");
        ErasureReason reason = REASON_MAP.get(reasonStr);
        if (reason == null) {
            throw new BadRequestException("Unknown erasure reason: " + reasonStr);
        }
        LedgerErasureService.ErasureResult result = erasureService.erase(rawActorId, reason);
        return new ErasureResponse(
                result.receiptEntryId().map(UUID::toString).orElse(null),
                result.mappingFound() ? "WITHDRAWN" : "ALREADY_WITHDRAWN",
                Instant.now().toString(),
                result.affectedEntryCount());
    }
}
