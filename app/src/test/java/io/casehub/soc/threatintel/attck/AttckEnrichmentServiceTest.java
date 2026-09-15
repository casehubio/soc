package io.casehub.soc.threatintel.attck;

import io.casehub.neocortex.mindmap.*;
import io.casehub.neocortex.mindmap.inmem.InMemoryMindMapStore;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static io.casehub.soc.threatintel.attck.AttckConstants.REFERENCE_TENANT;
import static org.assertj.core.api.Assertions.assertThat;

class AttckEnrichmentServiceTest {

    private static AttckEnrichmentService service;

    @BeforeAll
    static void setUp() {
        var store = new InMemoryMindMapStore();
        store.registerVocabulary(MindMapVocabulary.builder()
                .edgeType("uses").edgeType("mitigates").edgeType("subtechnique-of")
                .build());

        String sgId = store.createSubgraph(
                new SubgraphInput("mitre-attack", "mitre-attack", null), REFERENCE_TENANT);

        String t1003Id = store.addNode(NodeInput.of("OS Credential Dumping", sgId)
                .withTraits(Set.of("attack-technique"))
                .withProperties(Map.of("mitreId", "T1003")), REFERENCE_TENANT);
        store.addAlias(t1003Id, "T1003", REFERENCE_TENANT);

        String t1003001Id = store.addNode(NodeInput.of("LSASS Memory", sgId)
                .withTraits(Set.of("attack-technique"))
                .withProperties(Map.of("mitreId", "T1003.001")), REFERENCE_TENANT);
        store.addAlias(t1003001Id, "T1003.001", REFERENCE_TENANT);

        String g0007Id = store.addNode(NodeInput.of("APT28", sgId)
                .withTraits(Set.of("threat-group"))
                .withProperties(Map.of("mitreId", "G0007")), REFERENCE_TENANT);
        store.addAlias(g0007Id, "G0007", REFERENCE_TENANT);

        String m1026Id = store.addNode(NodeInput.of("Privileged Account Management", sgId)
                .withTraits(Set.of("mitigation"))
                .withProperties(Map.of("mitreId", "M1026")), REFERENCE_TENANT);
        store.addAlias(m1026Id, "M1026", REFERENCE_TENANT);

        String mimikatzId = store.addNode(NodeInput.of("Mimikatz", sgId)
                .withTraits(Set.of("malware"))
                .withProperties(Map.of("mitreId", "S0002")), REFERENCE_TENANT);
        store.addAlias(mimikatzId, "S0002", REFERENCE_TENANT);

        store.addEdge(EdgeInput.of(g0007Id, t1003Id, "uses"), REFERENCE_TENANT);
        store.addEdge(EdgeInput.of(m1026Id, t1003Id, "mitigates"), REFERENCE_TENANT);
        store.addEdge(EdgeInput.of(t1003001Id, t1003Id, "subtechnique-of"), REFERENCE_TENANT);
        store.addEdge(EdgeInput.of(mimikatzId, t1003Id, "uses"), REFERENCE_TENANT);
        store.addEdge(EdgeInput.of(g0007Id, mimikatzId, "uses"), REFERENCE_TENANT);

        service = new AttckEnrichmentService();
        service.mindMapStore = store;
    }

    @Test
    void getRelatedGroups_returnsInboundUsesEdgesWithThreatGroupTrait() {
        var result = service.getRelatedGroups("T1003");
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().mitreId()).isEqualTo("G0007");
        assertThat(result.getFirst().name()).isEqualTo("APT28");
        assertThat(result.getFirst().trait()).isEqualTo("threat-group");
    }

    @Test
    void getRelatedGroups_filtersOutNonGroupTraits() {
        var result = service.getRelatedGroups("T1003");
        assertThat(result.stream().map(AttckRelatedEntity::trait))
                .doesNotContain("malware");
    }

    @Test
    void getMitigations_returnsInboundMitigatesEdges() {
        var result = service.getMitigations("T1003");
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().mitreId()).isEqualTo("M1026");
        assertThat(result.getFirst().name()).isEqualTo("Privileged Account Management");
    }

    @Test
    void getSubTechniques_returnsInboundSubtechniqueOfEdges() {
        var result = service.getSubTechniques("T1003");
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().mitreId()).isEqualTo("T1003.001");
        assertThat(result.getFirst().name()).isEqualTo("LSASS Memory");
    }

    @Test
    void getGroupTechniques_returnsOutboundUsesEdges() {
        var result = service.getGroupTechniques("G0007");
        assertThat(result.stream().map(AttckRelatedEntity::trait))
                .allMatch(t -> t.equals("attack-technique"));
        assertThat(result.stream().map(AttckRelatedEntity::mitreId))
                .contains("T1003");
    }

    @Test
    void unknownMitreId_returnsEmptyList() {
        assertThat(service.getRelatedGroups("TXXX")).isEmpty();
        assertThat(service.getMitigations("TXXX")).isEmpty();
        assertThat(service.getSubTechniques("TXXX")).isEmpty();
        assertThat(service.getGroupTechniques("TXXX")).isEmpty();
    }
}
