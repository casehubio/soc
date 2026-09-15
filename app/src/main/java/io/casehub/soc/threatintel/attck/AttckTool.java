package io.casehub.soc.threatintel.attck;

public record AttckTool(
        String stixId, String mitreId, String name, String description
) {}
