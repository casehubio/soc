package io.casehub.soc.engine;

import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.soc.rest.dto.AlertHeatmapResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.QueryParam;

import java.util.List;
import java.util.Optional;

@McpDomain(value = "soc/alerts", app = "soc", basePath = "/api/soc/alerts", summary = "Security alert management — ingest, correlate, escalate")
@ApplicationScoped
public class SocAlertApi {

    @PlatformQuery("Get alert heatmap data by time range")
    @RestPath("/heatmap")
    public AlertHeatmapResponse getHeatmap(
            @QueryParam("timeUnit") Optional<String> timeUnit,
            @QueryParam("from") Optional<String> from,
            @QueryParam("to") Optional<String> to) {
        return new AlertHeatmapResponse(
            List.of(),
            List.of(),
            List.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"));
    }
}
