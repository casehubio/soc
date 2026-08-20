package io.casehub.soc.rest;

import io.casehub.api.context.CaseContext;
import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.platform.api.identity.CurrentPrincipal;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.*;

@Path("/api/soc/incidents/{id}/iocs")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SocIocSubmissionResource {

    private static final Set<String> VALID_IOC_TYPES = Set.of("IP", "HASH", "DOMAIN", "URL", "EMAIL");

    private final CaseInstanceRepository repository;
    private final CurrentPrincipal currentPrincipal;

    @Inject
    SocIocSubmissionResource(CaseInstanceRepository repository, CurrentPrincipal currentPrincipal) {
        this.repository = repository;
        this.currentPrincipal = currentPrincipal;
    }

    @POST
    @SuppressWarnings("unchecked")
    public Response submitIoc(@PathParam("id") UUID id, Map<String, Object> submission) {
        String type = submission.get("type") instanceof String s ? s : null;
        String value = submission.get("value") instanceof String s ? s : null;
        Number confidence = submission.get("confidence") instanceof Number n ? n : null;

        if (type == null || !VALID_IOC_TYPES.contains(type)) {
            return Response.status(400).entity(Map.of("error", "Invalid or missing IOC type")).build();
        }
        if (value == null || value.isBlank()) {
            return Response.status(400).entity(Map.of("error", "Missing IOC value")).build();
        }
        if (confidence == null || confidence.doubleValue() < 0.0 || confidence.doubleValue() > 1.0) {
            return Response.status(400).entity(Map.of("error", "Confidence must be 0.0-1.0")).build();
        }

        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null) {
            return Response.status(404).entity(Map.of("error", "Incident not found")).build();
        }

        Map<String, Object> ioc = new LinkedHashMap<>();
        ioc.put("type", type);
        ioc.put("value", value);
        ioc.put("confidence", confidence.doubleValue());
        ioc.put("source", "manual-submission");
        ioc.put("firstSeen", Instant.now().toString());
        ioc.put("tags", List.of());

        CaseContext ctx = ci.getCaseContext();
        Object existing = ctx.get("iocEnrichment");
        List<Map<String, Object>> iocList;
        if (existing instanceof List<?> list) {
            iocList = new ArrayList<>((List<Map<String, Object>>) list);
        } else {
            iocList = new ArrayList<>();
        }
        iocList.add(ioc);
        ctx.set("iocEnrichment", iocList);

        return Response.ok(Map.of("iocs", iocList)).build();
    }
}
