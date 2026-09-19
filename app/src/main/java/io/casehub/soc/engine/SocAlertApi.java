package io.casehub.soc.engine;

import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.soc.rest.dto.AlertHeatmapResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.QueryParam;

import java.util.List;

@McpDomain(value = "soc/alerts", basePath = "/api/soc/alerts")
@ApplicationScoped
public class SocAlertApi {

    @PlatformQuery("Get alert heatmap data by time range")
    @RestPath("/heatmap")
    public AlertHeatmapResponse getHeatmap(
            @QueryParam("timeUnit") String timeUnit,
            @QueryParam("from") String from,
            @QueryParam("to") String to) {
        return new AlertHeatmapResponse(
            List.of(),
            List.of(),
            List.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"));
    }
}
