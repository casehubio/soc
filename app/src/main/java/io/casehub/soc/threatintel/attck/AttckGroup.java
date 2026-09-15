package io.casehub.soc.threatintel.attck;

import java.util.List;

public record AttckGroup(
        String stixId, String mitreId, String name, String description,
        List<String> aliases
) {}
