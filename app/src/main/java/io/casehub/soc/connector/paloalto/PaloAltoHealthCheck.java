package io.casehub.soc.connector.paloalto;

import io.casehub.platform.api.mcp.HandWrittenEndpoint;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import io.casehub.platform.api.mcp.HandWrittenEndpoint;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

@HandWrittenEndpoint("external system health check")
@Path("/paloalto/health")
@ApplicationScoped
@HandWrittenEndpoint("Palo Alto connectivity health check")
public class PaloAltoHealthCheck {

    @Inject
    PaloAltoApiClient apiClient;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response health() {
        try {
            apiClient.systemInfo();
            return Response.ok(Map.of("status", "UP")).build();
        } catch (Exception e) {
            return Response.status(503)
                    .entity(Map.of("status", "DOWN", "reason", e.getMessage()))
                    .build();
        }
    }
}
