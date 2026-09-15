package io.casehub.soc.threatintel.attck;

import java.util.List;

public record AttckBundle(
        String version,
        List<AttckTechnique> techniques,
        List<AttckGroup> groups,
        List<AttckMitigation> mitigations,
        List<AttckMalware> malware,
        List<AttckTool> tools,
        List<AttckRelationship> relationships
) {}
