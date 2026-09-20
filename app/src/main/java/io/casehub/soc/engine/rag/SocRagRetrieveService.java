package io.casehub.soc.engine.rag;

import io.casehub.neocortex.rag.CaseRetriever;
import io.casehub.neocortex.rag.CorpusRef;
import io.casehub.neocortex.rag.RetrievalQuery;
import io.casehub.neocortex.rag.RetrievedChunk;
import io.casehub.soc.threatintel.attck.AttckConstants;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SocRagRetrieveService {

    private static final Logger LOG = Logger.getLogger(SocRagRetrieveService.class);
    private static final int MAX_RESULTS = 10;

    @Inject
    CaseRetriever caseRetriever;

    public List<Map<String, Object>> retrieve(
            Map<String, Object> caseContext, String tenantId) {
        String queryText = buildQueryText(caseContext);
        if (queryText.isBlank()) {
            LOG.debug("No searchable content in context — skipping RAG retrieval");
            return List.of();
        }

        try {
            var query = RetrievalQuery.of(queryText);
            var corpus = new CorpusRef(
                AttckConstants.REFERENCE_TENANT, AttckConstants.CORPUS_NAME);
            List<RetrievedChunk> chunks =
                caseRetriever.retrieve(query, corpus, MAX_RESULTS);

            LOG.infof("RAG retrieved %d chunk(s) for tenant=%s",
                chunks.size(), tenantId);
            return chunks.stream().map(this::toSerializable).toList();
        } catch (Exception e) {
            LOG.warnf(e, "RAG retrieval failed — returning empty list");
            return List.of();
        }
    }

    String buildQueryText(Map<String, Object> caseContext) {
        var parts = new ArrayList<String>();

        @SuppressWarnings("unchecked")
        var alert = (Map<String, Object>) caseContext.getOrDefault("alert", Map.of());
        addIfPresent(parts, alert, "rule");
        addIfPresent(parts, alert, "description");

        @SuppressWarnings("unchecked")
        var attckMapping = (Map<String, Object>)
            caseContext.getOrDefault("attckMapping", Map.of());
        @SuppressWarnings("unchecked")
        var techniques = (List<Map<String, Object>>)
            attckMapping.getOrDefault("techniques", List.of());
        for (var t : techniques) {
            addIfPresent(parts, t, "technique");
        }

        @SuppressWarnings("unchecked")
        var iocEnrichment = (Map<String, Object>)
            caseContext.getOrDefault("iocEnrichment", Map.of());
        @SuppressWarnings("unchecked")
        var iocs = (List<Map<String, Object>>)
            iocEnrichment.getOrDefault("iocs", List.of());
        for (var ioc : iocs) {
            addIfPresent(parts, ioc, "type");
        }

        return String.join(" ", parts);
    }

    private Map<String, Object> toSerializable(RetrievedChunk chunk) {
        var result = new LinkedHashMap<String, Object>();
        result.put("content", chunk.content());
        result.put("sourceDocumentId", chunk.sourceDocumentId());
        result.put("relevanceScore", chunk.relevanceScore());
        chunk.metadata().forEach(result::put);
        return Collections.unmodifiableMap(result);
    }

    private static void addIfPresent(
            List<String> parts, Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof String s && !s.isBlank()) {
            parts.add(s);
        }
    }
}
