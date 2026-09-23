package io.casehub.soc.rest;

import io.casehub.platform.api.mcp.HandWrittenEndpoint;
import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import jakarta.enterprise.context.ApplicationScoped;
import io.casehub.platform.api.mcp.HandWrittenEndpoint;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@HandWrittenEndpoint("simulation-only connector")
@Path("/sim/containment")
@ApplicationScoped
@HandWrittenEndpoint("Demo simulation endpoint for containment testing")
public class SimulatedContainmentConnector {

    private static final Logger LOG = Logger.getLogger(SimulatedContainmentConnector.class);

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ContainmentResponse execute(ContainmentRequest request) {
        LOG.infof("SIM containment: %s for case %s (tenant=%s)",
                request.actionType(), request.caseId(), request.tenancyId());

        String simId = "sim-" + UUID.randomUUID().toString().substring(0, 8);

        return new ContainmentResponse(
                true,
                "Simulated " + request.actionType() + " executed successfully",
                null,
                false,
                Map.of("sim_id", simId,
                       "sim_action_type", request.actionType(),
                       "sim_latency_ms", ThreadLocalRandom.current().nextInt(50, 500)));
    }
}
