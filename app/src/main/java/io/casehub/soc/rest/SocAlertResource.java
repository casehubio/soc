package io.casehub.soc.rest;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;

import java.util.List;
import java.util.Map;

@Path("/api/soc/alerts")
@ApplicationScoped
public class SocAlertResource {

    @GET @Path("/heatmap")
    public Map<String, Object> getHeatmap(
            @QueryParam("timeUnit") String timeUnit,
            @QueryParam("from") String from,
            @QueryParam("to") String to) {
        return Map.of(
            "cells", List.of(),
            "sources", List.of(),
            "severities", List.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL")
        );
    }
}
