package io.casehub.soc.threatintel.attck;

import io.casehub.neocortex.mindmap.MindMapStore;
import io.casehub.neocortex.mindmap.inmem.InMemoryMindMapStore;
import io.casehub.neocortex.rag.testing.InMemoryEmbeddingIngestor;
import io.quarkus.runtime.StartupEvent;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.casehub.soc.threatintel.attck.AttckConstants.*;
import static org.assertj.core.api.Assertions.assertThat;

class AttckIngestionServiceTest {

    private static MindMapStore mindMapStore;
    private static AttckEnrichmentService enrichmentService;

    @BeforeAll
    static void ingest() {
        mindMapStore = new InMemoryMindMapStore();
        var ingestor = new InMemoryEmbeddingIngestor();

        var service = new AttckIngestionService();
        service.enabled = true;
        service.mindMapStore = mindMapStore;
        service.embeddingIngestor = ingestor;
        service.onStartup(new StartupEvent());

        enrichmentService = new AttckEnrichmentService();
        enrichmentService.mindMapStore = mindMapStore;
    }

    @Test
    void nodesExistWithCorrectTraitsAndProperties() {
        var subgraphs = mindMapStore.listSubgraphs(REFERENCE_TENANT);
        var sg = subgraphs.stream()
                .filter(s -> s.name().equals(SUBGRAPH_NAME))
                .findFirst().orElseThrow();
        var nodes = mindMapStore.nodesIn(sg.id(), REFERENCE_TENANT);
        assertThat(nodes).isNotEmpty();

        var t1003 = mindMapStore.resolveNode("T1003", null, REFERENCE_TENANT);
        assertThat(t1003).isNotNull();
        assertThat(t1003.traits()).contains("attack-technique");
        assertThat(t1003.property("mitreId")).hasValue("T1003");
        assertThat(t1003.property("tactics")).hasValue("credential-access");
    }

    @Test
    void edgesExistForRelationships() {
        var groups = enrichmentService.getRelatedGroups("T1003");
        assertThat(groups).isNotEmpty();
        assertThat(groups.stream().map(AttckRelatedEntity::name))
                .contains("APT28");
    }

    @Test
    void enrichmentServiceReturnsCorrectResults() {
        assertThat(enrichmentService.getMitigations("T1003")).isNotEmpty();
        assertThat(enrichmentService.getSubTechniques("T1003")).isNotEmpty();
        assertThat(enrichmentService.getGroupTechniques("G0007")).isNotEmpty();
    }

    @Test
    void aliasRegistration() {
        assertThat(mindMapStore.resolveNode("T1003", null, REFERENCE_TENANT)).isNotNull();
        assertThat(mindMapStore.resolveNode("T1003.001", null, REFERENCE_TENANT)).isNotNull();
        assertThat(mindMapStore.resolveNode("G0007", null, REFERENCE_TENANT)).isNotNull();
        assertThat(mindMapStore.resolveNode("G0016", null, REFERENCE_TENANT)).isNotNull();
        assertThat(mindMapStore.resolveNode("M1026", null, REFERENCE_TENANT)).isNotNull();
        assertThat(mindMapStore.resolveNode("S0002", null, REFERENCE_TENANT)).isNotNull();
        assertThat(mindMapStore.resolveNode("S0029", null, REFERENCE_TENANT)).isNotNull();
    }

    @Test
    void rootNodeVersionStorage() {
        var subgraphs = mindMapStore.listSubgraphs(REFERENCE_TENANT);
        var sg = subgraphs.stream()
                .filter(s -> s.name().equals(SUBGRAPH_NAME))
                .findFirst().orElseThrow();
        assertThat(sg.rootNodeId()).isNotNull();
        var rootNode = mindMapStore.getNode(sg.rootNodeId(), REFERENCE_TENANT);
        assertThat(rootNode).isNotNull();
        assertThat(rootNode.property("attck-version")).hasValue("16.1");
    }

    @Test
    void versionCheckPreventsReIngestion() {
        var nodeCountBefore = mindMapStore.listSubgraphs(REFERENCE_TENANT).stream()
                .filter(s -> s.name().equals(SUBGRAPH_NAME))
                .map(sg -> mindMapStore.nodesIn(sg.id(), REFERENCE_TENANT).size())
                .findFirst().orElse(0);

        var service2 = new AttckIngestionService();
        service2.enabled = true;
        service2.mindMapStore = mindMapStore;
        service2.embeddingIngestor = new InMemoryEmbeddingIngestor();
        service2.onStartup(new StartupEvent());

        var nodeCountAfter = mindMapStore.listSubgraphs(REFERENCE_TENANT).stream()
                .filter(s -> s.name().equals(SUBGRAPH_NAME))
                .map(sg -> mindMapStore.nodesIn(sg.id(), REFERENCE_TENANT).size())
                .findFirst().orElse(0);
        assertThat(nodeCountAfter).isEqualTo(nodeCountBefore);
    }

    @Test
    void danglingEdgesAreDropped() {
        var t1003 = mindMapStore.resolveNode("T1003", null, REFERENCE_TENANT);
        assertThat(t1003).isNotNull();
        var usesEdges = mindMapStore.neighbors(t1003.id(), "uses", REFERENCE_TENANT);
        var inboundSources = usesEdges.stream()
                .filter(e -> e.targetNodeId().equals(t1003.id()))
                .map(e -> mindMapStore.getNode(e.sourceNodeId(), REFERENCE_TENANT))
                .toList();
        assertThat(inboundSources).allMatch(java.util.Objects::nonNull);
    }

    @Test
    void malwareAndToolNodesIngested() {
        var mimikatz = mindMapStore.resolveNode("S0002", null, REFERENCE_TENANT);
        assertThat(mimikatz).isNotNull();
        assertThat(mimikatz.traits()).contains("malware");

        var psexec = mindMapStore.resolveNode("S0029", null, REFERENCE_TENANT);
        assertThat(psexec).isNotNull();
        assertThat(psexec.traits()).contains("attack-tool");
    }
}
