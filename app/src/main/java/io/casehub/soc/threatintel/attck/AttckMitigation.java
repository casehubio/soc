package io.casehub.soc.threatintel.attck;

public record AttckMitigation(
        String stixId, String mitreId, String name, String description
) {}
