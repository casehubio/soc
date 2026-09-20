package io.casehub.soc.engine.rag;

import io.casehub.neocortex.rag.CaseContextRetriever;
import io.casehub.neocortex.rag.CorpusRef;
import io.casehub.soc.threatintel.attck.AttckConstants;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SocRagRetrieveService {

    private static final int MAX_RESULTS = 10;
    private static final List<CorpusRef> CORPORA = List.of(
        new CorpusRef(AttckConstants.REFERENCE_TENANT, AttckConstants.CORPUS_NAME));

    @Inject
    CaseContextRetriever contextRetriever;

    public List<Map<String, Object>> retrieve(
            Map<String, Object> caseContext, String tenantId) {
        String queryText = buildQueryText(caseContext);
        return contextRetriever.retrieve(queryText, CORPORA, MAX_RESULTS).stream()
            .map(CaseContextRetriever::toMap)
            .toList();
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

    private static void addIfPresent(
            List<String> parts, Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof String s && !s.isBlank()) {
            parts.add(s);
        }
    }
}
