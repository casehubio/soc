package io.casehub.soc.rest;

import io.casehub.ledger.runtime.service.model.InclusionProof;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.soc.domain.DoraResponseTimeReport;
import io.casehub.soc.engine.compliance.SocComplianceService;
import io.casehub.soc.engine.compliance.SocLedgerEntry;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Path("/api/soc/compliance")
@ApplicationScoped
@RolesAllowed("soc-compliance-viewer")
public class SocComplianceResource {

    @Inject SocComplianceService service;
    @Inject CurrentPrincipal currentPrincipal;

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
}
