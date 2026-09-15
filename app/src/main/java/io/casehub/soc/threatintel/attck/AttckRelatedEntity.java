package io.casehub.soc.threatintel.attck;

import io.casehub.neocortex.mindmap.MindMapNode;

import java.util.Set;

public record AttckRelatedEntity(String mitreId, String name, String trait) {

    private static final Set<String> ATTCK_TRAITS = Set.of(
            "attack-technique", "threat-group", "mitigation", "malware", "attack-tool", "metadata");

    static AttckRelatedEntity from(MindMapNode node) {
        String trait = node.traits().stream()
                .filter(ATTCK_TRAITS::contains)
                .findFirst().orElse("");
        return new AttckRelatedEntity(
                node.property("mitreId").orElse(""),
                node.name(),
                trait);
    }
}
