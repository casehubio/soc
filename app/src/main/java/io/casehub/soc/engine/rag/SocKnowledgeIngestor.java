package io.casehub.soc.engine.rag;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.neocortex.rag.ChunkInput;
import io.casehub.neocortex.rag.CorpusRef;
import io.casehub.neocortex.rag.EmbeddingIngestor;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.*;

@ApplicationScoped
public class SocKnowledgeIngestor {
    private static final Logger LOG = Logger.getLogger(SocKnowledgeIngestor.class);


    private final EmbeddingIngestor embeddingIngestor;

    @Inject
    public SocKnowledgeIngestor(EmbeddingIngestor embeddingIngestor) {
        this.embeddingIngestor = embeddingIngestor;
    }

    public void ingest(CaseOutcomeEvent event) {
        try {
            var    snapshot     = event.caseFileSnapshot();
            String narrative    = buildNarrative(snapshot);
            var    metadata     = buildMetadata(snapshot);
            var    listMetadata = buildListMetadata(snapshot);
            var    chunk        = new ChunkInput(narrative, event.caseId().toString(), metadata, listMetadata);
            var    corpus       = new CorpusRef(event.tenancyId(), SocKnowledgeConstants.CORPUS_NAME);
            embeddingIngestor.ingest(corpus, List.of(chunk));
            LOG.infof("Knowledge ingested for caseId=%s tenant=%s", event.caseId(), event.tenancyId());
        } catch (Exception e) {
            LOG.warnf(e, "Knowledge ingestion failed for caseId=%s — incident not stored for RAG retrieval",
                      event.caseId());
        }
    }

    @SuppressWarnings("unchecked")
    String buildNarrative(Map<String, Object> snapshot) {
        var    parts       = new ArrayList<String>();
        var    alert       = (Map<String, Object>) snapshot.getOrDefault("alert", Map.of());
        String alertType   = (String) alert.get("type");
        String description = (String) alert.get("description");
        String source      = (String) alert.get("source");

        if (alertType != null) {parts.add("Alert type: " + alertType);}
        if (source != null) {parts.add("Source: " + source);}
        if (description != null) {parts.add("Description: " + description);}

        String analystOutcome = (String) snapshot.get("analystOutcome");
        if (analystOutcome != null) {parts.add("Analyst outcome: " + analystOutcome);}

        var attckMapping = (Map<String, Object>) snapshot.getOrDefault("attckMapping", Map.of());
        var techniques   = (List<Map<String, Object>>) attckMapping.getOrDefault("techniques", List.of());
        if (!techniques.isEmpty()) {
            var names = techniques.stream()
                                  .map(t -> {
                                      String id   = (String) t.get("id");
                                      String name = (String) t.get("technique");
                                      return name != null ? name + " (" + id + ")" : id;
                                  })
                                  .filter(Objects::nonNull)
                                  .toList();
            if (!names.isEmpty()) {parts.add("ATT&CK techniques: " + String.join(", ", names));}
        }

        var    containmentRec = (Map<String, Object>) snapshot.getOrDefault("containmentRecommendation", Map.of());
        String playbook       = (String) containmentRec.get("playbook");
        String summary        = (String) containmentRec.get("summary");
        if (playbook != null) {parts.add("Playbook: " + playbook);}
        if (summary != null) {parts.add("Containment: " + summary);}

        if (parts.isEmpty()) parts.add("Incident post-mortem");
        return String.join(". ", parts);
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> buildMetadata(Map<String, Object> snapshot) {
        var meta = new LinkedHashMap<String, String>();
        meta.put("type", "incident-postmortem");
        var    alert     = (Map<String, Object>) snapshot.getOrDefault("alert", Map.of());
        String alertType = (String) alert.get("type");
        String source    = (String) alert.get("source");
        if (alertType != null) {meta.put("alertType", alertType);}
        if (source != null) {meta.put("sourceSystem", source);}
        return Map.copyOf(meta);
    }

    @SuppressWarnings("unchecked")
    private Map<String, List<String>> buildListMetadata(Map<String, Object> snapshot) {
        var attckMapping = (Map<String, Object>) snapshot.getOrDefault("attckMapping", Map.of());
        var techniques   = (List<Map<String, Object>>) attckMapping.getOrDefault("techniques", List.of());
        List<String> techniqueIds = techniques.stream()
                                              .map(t -> (String) t.get("id"))
                                              .filter(Objects::nonNull)
                                              .toList();
        if (techniqueIds.isEmpty()) {return Map.of();}
        return Map.of("attckTechniqueIds", techniqueIds);
    }

}
