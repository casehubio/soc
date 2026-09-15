package io.casehub.soc.threatintel.attck;

import java.util.List;

public record AttckTechnique(
        String stixId, String mitreId, String name, String description,
        String detection, List<String> tactics, List<String> platforms,
        List<String> dataSources, String version, boolean isSubtechnique
) {}
