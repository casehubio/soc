package io.casehub.soc.threatintel.attck;

import io.casehub.neocortex.mindmap.MindMapNode;
import io.casehub.neocortex.mindmap.MindMapStore;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Objects;

import static io.casehub.soc.threatintel.attck.AttckConstants.REFERENCE_TENANT;

@ApplicationScoped
public class AttckEnrichmentService {

    @Inject
    MindMapStore mindMapStore;

    public List<AttckRelatedEntity> getRelatedGroups(String mitreId) {
        MindMapNode node = mindMapStore.resolveNode(mitreId, null, REFERENCE_TENANT);
        if (node == null) return List.of();
        return mindMapStore.neighbors(node.id(), "uses", REFERENCE_TENANT).stream()
                .filter(edge -> edge.targetNodeId().equals(node.id()))
                .map(edge -> mindMapStore.getNode(edge.sourceNodeId(), REFERENCE_TENANT))
                .filter(n -> n != null && n.traits().contains("threat-group"))
                .map(AttckRelatedEntity::from)
                .toList();
    }

    public List<AttckRelatedEntity> getMitigations(String mitreId) {
        MindMapNode node = mindMapStore.resolveNode(mitreId, null, REFERENCE_TENANT);
        if (node == null) return List.of();
        return mindMapStore.neighbors(node.id(), "mitigates", REFERENCE_TENANT).stream()
                .filter(edge -> edge.targetNodeId().equals(node.id()))
                .map(edge -> mindMapStore.getNode(edge.sourceNodeId(), REFERENCE_TENANT))
                .filter(n -> n != null && n.traits().contains("mitigation"))
                .map(AttckRelatedEntity::from)
                .toList();
    }

    public List<AttckRelatedEntity> getSubTechniques(String mitreId) {
        MindMapNode node = mindMapStore.resolveNode(mitreId, null, REFERENCE_TENANT);
        if (node == null) return List.of();
        return mindMapStore.neighbors(node.id(), "subtechnique-of", REFERENCE_TENANT).stream()
                .filter(edge -> edge.targetNodeId().equals(node.id()))
                .map(edge -> mindMapStore.getNode(edge.sourceNodeId(), REFERENCE_TENANT))
                .filter(Objects::nonNull)
                .map(AttckRelatedEntity::from)
                .toList();
    }

    public List<AttckRelatedEntity> getGroupTechniques(String groupMitreId) {
        MindMapNode node = mindMapStore.resolveNode(groupMitreId, null, REFERENCE_TENANT);
        if (node == null) return List.of();
        return mindMapStore.neighbors(node.id(), "uses", REFERENCE_TENANT).stream()
                .filter(edge -> edge.sourceNodeId().equals(node.id()))
                .map(edge -> mindMapStore.getNode(edge.targetNodeId(), REFERENCE_TENANT))
                .filter(n -> n != null && n.traits().contains("attack-technique"))
                .map(AttckRelatedEntity::from)
                .toList();
    }
}
