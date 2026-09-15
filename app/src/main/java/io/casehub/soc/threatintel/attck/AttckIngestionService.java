package io.casehub.soc.threatintel.attck;

import io.casehub.neocortex.mindmap.*;
import io.casehub.neocortex.rag.ChunkInput;
import io.casehub.neocortex.rag.CorpusRef;
import io.casehub.neocortex.rag.EmbeddingIngestor;
import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.*;

import static io.casehub.soc.threatintel.attck.AttckConstants.*;

@ApplicationScoped
public class AttckIngestionService {

    @ConfigProperty(name = "casehub.soc.attck.enabled", defaultValue = "true")
    boolean enabled;

    @Inject
    MindMapStore mindMapStore;

    @Inject
    EmbeddingIngestor embeddingIngestor;

    void onStartup(@Observes StartupEvent event) {
        if (!enabled) {
            Log.info("ATT&CK ingestion disabled via config");
            return;
        }

        if (!mindMapStore.capabilities().contains(MindMapCapability.SUBGRAPH)) {
            Log.info("MindMapStore does not support SUBGRAPH — skipping ATT&CK ingestion");
            return;
        }

        try {
            var stixStream = getClass().getResourceAsStream("/threatintel/enterprise-attack.json");
            if (stixStream == null) {
                Log.warn("ATT&CK STIX bundle not found on classpath — skipping ingestion");
                return;
            }

            AttckBundle bundle;
            try (stixStream) {
                bundle = new AttckStixParser().parse(stixStream);
            }

            var subgraphs = mindMapStore.listSubgraphs(REFERENCE_TENANT);
            var existing = subgraphs.stream()
                    .filter(s -> s.name().equals(SUBGRAPH_NAME))
                    .findFirst().orElse(null);
            String storedVersion = null;
            if (existing != null && existing.rootNodeId() != null) {
                var rootNode = mindMapStore.getNode(existing.rootNodeId(), REFERENCE_TENANT);
                if (rootNode != null) {
                    storedVersion = rootNode.property("attck-version").orElse(null);
                }
            }

            if (bundle.version().equals(storedVersion)) return;

            if (existing != null) {
                mindMapStore.eraseSubgraph(existing.id(), REFERENCE_TENANT);
            }

            CorpusRef corpus = new CorpusRef(REFERENCE_TENANT, CORPUS_NAME);
            boolean corpusCleanupFailed = false;
            try {
                embeddingIngestor.deleteCorpus(corpus);
            } catch (Exception e) {
                Log.warn("deleteCorpus failed — RAG re-ingestion will be skipped to prevent duplicates", e);
                corpusCleanupFailed = true;
            }

            mindMapStore.registerVocabulary(MindMapVocabulary.builder()
                    .edgeType("uses").edgeType("mitigates").edgeType("subtechnique-of")
                    .build());

            String subgraphId = mindMapStore.createSubgraph(
                    new SubgraphInput(SUBGRAPH_NAME, SUBGRAPH_NAME, null),
                    REFERENCE_TENANT);

            Map<String, String> stixToStoreId = new HashMap<>();
            for (var t : bundle.techniques()) {
                String storeId = mindMapStore.addNode(
                        NodeInput.of(t.name(), subgraphId)
                                .withTraits(Set.of("attack-technique"))
                                .withRefs(Set.of(new NodeRef("mitre-attack", t.mitreId(), null)))
                                .withProperties(Map.of(
                                        "mitreId", t.mitreId(),
                                        "name", t.name(),
                                        "tactics", String.join(",", t.tactics()),
                                        "platforms", String.join(",", t.platforms()),
                                        "dataSources", String.join(",", t.dataSources()),
                                        "version", t.version(),
                                        "isSubtechnique", String.valueOf(t.isSubtechnique()))),
                        REFERENCE_TENANT);
                mindMapStore.addAlias(storeId, t.mitreId(), REFERENCE_TENANT);
                stixToStoreId.put(t.stixId(), storeId);
            }
            for (var g : bundle.groups()) {
                String storeId = mindMapStore.addNode(
                        NodeInput.of(g.name(), subgraphId)
                                .withTraits(Set.of("threat-group"))
                                .withRefs(Set.of(new NodeRef("mitre-attack", g.mitreId(), null)))
                                .withProperties(Map.of(
                                        "mitreId", g.mitreId(),
                                        "name", g.name(),
                                        "aliases", String.join(",", g.aliases()))),
                        REFERENCE_TENANT);
                mindMapStore.addAlias(storeId, g.mitreId(), REFERENCE_TENANT);
                stixToStoreId.put(g.stixId(), storeId);
            }
            for (var m : bundle.mitigations()) {
                String storeId = mindMapStore.addNode(
                        NodeInput.of(m.name(), subgraphId)
                                .withTraits(Set.of("mitigation"))
                                .withRefs(Set.of(new NodeRef("mitre-attack", m.mitreId(), null)))
                                .withProperties(Map.of("mitreId", m.mitreId(), "name", m.name())),
                        REFERENCE_TENANT);
                mindMapStore.addAlias(storeId, m.mitreId(), REFERENCE_TENANT);
                stixToStoreId.put(m.stixId(), storeId);
            }
            for (var mw : bundle.malware()) {
                String storeId = mindMapStore.addNode(
                        NodeInput.of(mw.name(), subgraphId)
                                .withTraits(Set.of("malware"))
                                .withRefs(Set.of(new NodeRef("mitre-attack", mw.mitreId(), null)))
                                .withProperties(Map.of("mitreId", mw.mitreId(), "name", mw.name())),
                        REFERENCE_TENANT);
                mindMapStore.addAlias(storeId, mw.mitreId(), REFERENCE_TENANT);
                stixToStoreId.put(mw.stixId(), storeId);
            }
            for (var tool : bundle.tools()) {
                String storeId = mindMapStore.addNode(
                        NodeInput.of(tool.name(), subgraphId)
                                .withTraits(Set.of("attack-tool"))
                                .withRefs(Set.of(new NodeRef("mitre-attack", tool.mitreId(), null)))
                                .withProperties(Map.of("mitreId", tool.mitreId(), "name", tool.name())),
                        REFERENCE_TENANT);
                mindMapStore.addAlias(storeId, tool.mitreId(), REFERENCE_TENANT);
                stixToStoreId.put(tool.stixId(), storeId);
            }

            int droppedSrcMissing = 0, droppedTgtMissing = 0;
            for (var rel : bundle.relationships()) {
                String src = stixToStoreId.get(rel.sourceRef());
                String tgt = stixToStoreId.get(rel.targetRef());
                if (src != null && tgt != null) {
                    mindMapStore.addEdge(EdgeInput.of(src, tgt, rel.relationshipType()), REFERENCE_TENANT);
                } else {
                    if (src == null) droppedSrcMissing++;
                    if (tgt == null) droppedTgtMissing++;
                }
            }
            if (droppedSrcMissing + droppedTgtMissing > 0) {
                Log.infof("ATT&CK edges dropped: %d (source missing: %d, target missing: %d)",
                        droppedSrcMissing + droppedTgtMissing, droppedSrcMissing, droppedTgtMissing);
            }

            if (!corpusCleanupFailed) {
                try {
                    embeddingIngestor.ingest(corpus, buildTechniqueChunks(bundle.techniques()));
                    embeddingIngestor.ingest(corpus, buildGroupChunks(bundle.groups()));
                    embeddingIngestor.ingest(corpus, buildMitigationChunks(bundle.mitigations()));
                    embeddingIngestor.ingest(corpus, buildMalwareChunks(bundle.malware()));
                    embeddingIngestor.ingest(corpus, buildToolChunks(bundle.tools()));
                } catch (Exception e) {
                    Log.warn("RAG ingestion failed — MindMap available, prose retrieval unavailable", e);
                }
            } else {
                Log.warn("RAG re-ingestion skipped — stale RAG data may remain until next successful re-ingestion");
            }

            String rootId = mindMapStore.addNode(
                    NodeInput.of("mitre-attack-root", subgraphId)
                            .withTraits(Set.of("metadata"))
                            .withProperties(Map.of("attck-version", bundle.version())),
                    REFERENCE_TENANT);
            mindMapStore.updateSubgraph(subgraphId, rootId, REFERENCE_TENANT);

        } catch (Exception e) {
            Log.error("ATT&CK ingestion failed — enrichment unavailable, static lookup active", e);
        }
    }

    private List<ChunkInput> buildTechniqueChunks(List<AttckTechnique> techniques) {
        return techniques.stream().map(t -> {
            String content = t.detection() != null
                    ? t.description() + "\n\n" + t.detection()
                    : t.description();
            return new ChunkInput(content, t.mitreId(), Map.of(
                    "mitreId", t.mitreId(), "name", t.name(),
                    "tactics", String.join(",", t.tactics()), "type", "attack-technique"));
        }).toList();
    }

    private List<ChunkInput> buildGroupChunks(List<AttckGroup> groups) {
        return groups.stream().map(g -> new ChunkInput(
                g.description(), g.mitreId(), Map.of(
                        "mitreId", g.mitreId(), "name", g.name(), "type", "threat-group")))
                .toList();
    }

    private List<ChunkInput> buildMitigationChunks(List<AttckMitigation> mitigations) {
        return mitigations.stream().map(m -> new ChunkInput(
                m.description(), m.mitreId(), Map.of(
                        "mitreId", m.mitreId(), "name", m.name(), "type", "mitigation")))
                .toList();
    }

    private List<ChunkInput> buildMalwareChunks(List<AttckMalware> malware) {
        return malware.stream().map(m -> new ChunkInput(
                m.description(), m.mitreId(), Map.of(
                        "mitreId", m.mitreId(), "name", m.name(), "type", "malware")))
                .toList();
    }

    private List<ChunkInput> buildToolChunks(List<AttckTool> tools) {
        return tools.stream().map(t -> new ChunkInput(
                t.description(), t.mitreId(), Map.of(
                        "mitreId", t.mitreId(), "name", t.name(), "type", "attack-tool")))
                .toList();
    }
}
