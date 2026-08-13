package io.casehub.soc.detection;

import io.casehub.ras.api.DetectionResult;
import io.casehub.ras.api.JavaSwitchGanglion;
import io.casehub.ras.api.SituationContext;
import io.cloudevents.CloudEvent;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public class BruteForceDetectorGanglion extends JavaSwitchGanglion {

    public static final String GANGLION_ID = "brute-force-detector";

    public static final Set<String> EVENT_TYPES = Set.of(
            "soc.alert.auth.failed-login",
            "soc.alert.auth.failed-mfa",
            "soc.alert.auth.account-lockout",
            "soc.alert.auth.password-spray"
    );

    private final BruteForceScorer scorer;

    public BruteForceDetectorGanglion(BruteForceScorer scorer) {
        super(GANGLION_ID, EVENT_TYPES);
        this.scorer = scorer;
    }

    public BruteForceDetectorGanglion() {
        this(BruteForceScorer.DEFAULT);
    }

    @Override
    protected DetectionResult evaluate(CloudEvent event, SituationContext context) {
        double confidence = scorer.score(event);
        Map<String, Object> evidence = extractEvidence(event);
        return detected(confidence, evidence);
    }

    private Map<String, Object> extractEvidence(CloudEvent event) {
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("eventType", event.getType());
        addIfPresent(evidence, event, "sourceip", "sourceIp");
        addIfPresent(evidence, event, "targetaccount", "targetAccount");
        addIfPresent(evidence, event, "authmethod", "authMethod");
        addIfPresent(evidence, event, "geolocation", "geolocation");
        return Map.copyOf(evidence);
    }

    private static void addIfPresent(Map<String, Object> evidence, CloudEvent event,
                                     String extensionName, String evidenceKey) {
        Object value = event.getExtension(extensionName);
        if (value != null) {
            evidence.put(evidenceKey, value.toString());
        }
    }
}
