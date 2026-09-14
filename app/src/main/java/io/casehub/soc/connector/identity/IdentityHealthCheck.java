package io.casehub.soc.connector.identity;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

@Path("/identity/health")
@ApplicationScoped
public class IdentityHealthCheck {

    @Inject
    IdentityProvider provider;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response health() {
        try {
            IdentityResult result = provider.healthCheck();
            if (result.success()) {
                return Response.ok(Map.of("status", "UP",
                        "provider", provider.providerName())).build();
            }
            return Response.status(503)
                    .entity(Map.of("status", "DOWN",
                            "provider", provider.providerName(),
                            "reason", result.errorReason())).build();
        } catch (Exception e) {
            return Response.status(503)
                    .entity(Map.of("status", "DOWN", "reason", e.getMessage()))
                    .build();
        }
    }
}
