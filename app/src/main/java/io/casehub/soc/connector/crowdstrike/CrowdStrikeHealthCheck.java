package io.casehub.soc.connector.crowdstrike;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

@Path("/crowdstrike/health")
@ApplicationScoped
public class CrowdStrikeHealthCheck {

    @Inject
    CrowdStrikeOAuth2Client oAuth2Client;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response health() {
        try {
            oAuth2Client.getAccessToken();
            return Response.ok(Map.of("status", "UP")).build();
        } catch (Exception e) {
            return Response.status(503)
                    .entity(Map.of("status", "DOWN", "reason", e.getMessage()))
                    .build();
        }
    }
}
