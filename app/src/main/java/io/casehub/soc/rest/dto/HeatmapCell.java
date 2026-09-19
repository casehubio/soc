package io.casehub.soc.rest.dto;

public record HeatmapCell(String source, String severity,
    String timeUnit, int count) {}
