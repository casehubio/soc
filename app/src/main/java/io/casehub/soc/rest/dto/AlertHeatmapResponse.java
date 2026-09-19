package io.casehub.soc.rest.dto;

import java.util.List;

public record AlertHeatmapResponse(List<HeatmapCell> cells,
    List<String> sources, List<String> severities) {}
