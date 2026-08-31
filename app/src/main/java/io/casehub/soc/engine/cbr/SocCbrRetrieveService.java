package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.CbrCaseMemoryStore;
import io.casehub.neocortex.memory.cbr.CbrQuery;
import io.casehub.neocortex.memory.cbr.ScoredCbrCase;
import io.casehub.platform.api.path.Path;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SocCbrRetrieveService {

    private static final Logger LOG = Logger.getLogger(SocCbrRetrieveService.class);
    private static final MemoryDomain DOMAIN = new MemoryDomain("soc-incidents");
    private static final Path SCOPE = Path.of("casehubio", "soc", "incident-investigation");
    private static final int TOP_K = 5;
    private static final double MIN_SIMILARITY = 0.3;

    private final CbrCaseMemoryStore cbrStore;

    @Inject
    public SocCbrRetrieveService(CbrCaseMemoryStore cbrStore) {
        this.cbrStore = cbrStore;
    }

    public List<Map<String, Object>> retrieve(Map<String, Object> caseContext, String tenantId) {
        var features = SocIncidentCbrCase.extractRetrievalFeatures(caseContext);
        if (features.isEmpty()) {
            LOG.debug("No alert data in context — skipping CBR retrieval");
            return List.of();
        }
        try {
            var query = CbrQuery.of(tenantId, DOMAIN, SCOPE,
                    SocIncidentCbrCase.CBR_TYPE, features, TOP_K)
                .withMinSimilarity(MIN_SIMILARITY);

            List<ScoredCbrCase<SocIncidentCbrCase>> results =
                cbrStore.retrieveSimilar(query, SocIncidentCbrCase.class);

            LOG.infof("CBR retrieved %d similar incidents for tenant=%s", results.size(), tenantId);
            return results.stream().map(this::toSerializable).toList();
        } catch (Exception e) {
            LOG.warnf(e, "CBR retrieval failed — returning empty list");
            return List.of();
        }
    }

    private Map<String, Object> toSerializable(ScoredCbrCase<SocIncidentCbrCase> scored) {
        var c      = scored.cbrCase();
        var result = new LinkedHashMap<String, Object>();
        result.put("similarityScore", scored.score());
        putIfNotNull(result, "caseId", scored.caseId());
        putIfNotNull(result, "alertType", c.alertType());
        putIfNotNull(result, "sourceSystem", c.sourceSystem());
        if (c.attckTechniqueIds() != null && !c.attckTechniqueIds().isEmpty()) {
            result.put("attckTechniqueIds", c.attckTechniqueIds());
        }
        if (c.iocTypes() != null && !c.iocTypes().isEmpty()) {
            result.put("iocTypes", c.iocTypes());
        }
        putIfNotNull(result, "severityOutcome", c.severityOutcome());
        putIfNotNull(result, "containmentOutcome", c.containmentOutcome());
        putIfNotNull(result, "playbook", c.playbook());
        putIfNotNull(result, "problem", c.problem());
        putIfNotNull(result, "solution", c.solution());
        putIfNotNull(result, "outcome", c.outcome());
        return Collections.unmodifiableMap(result);}

    private static void putIfNotNull(Map<String, Object> map, String key, Object value) {
        if (value != null) {map.put(key, value);}
    }
}
