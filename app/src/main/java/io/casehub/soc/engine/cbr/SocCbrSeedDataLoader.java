package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.cognitive.Confidence;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.CbrCaseMemoryStore;
import io.casehub.neocortex.memory.cbr.FeatureValue;
import io.casehub.platform.api.path.Path;
import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class SocCbrSeedDataLoader {

    private static final Logger LOG = Logger.getLogger(SocCbrSeedDataLoader.class);
    private static final MemoryDomain DOMAIN = new MemoryDomain("soc-incidents");
    private static final Path SCOPE = Path.of("casehubio", "soc", "incident-investigation");
    private static final String TENANT = "278776f9-e1b0-46fb-9032-8bddebdcf9ce";

    private final CbrCaseMemoryStore cbrStore;

    @Inject
    public SocCbrSeedDataLoader(CbrCaseMemoryStore cbrStore) {
        this.cbrStore = cbrStore;
    }

    @Startup
    void loadSeedData() {
        List<SocIncidentCbrCase> incidents = seedIncidents();
        incidents.forEach(incident -> {
            String id = UUID.randomUUID().toString();
            cbrStore.store(incident, SocIncidentCbrCase.CBR_TYPE, id,
                DOMAIN, TENANT, id, SCOPE);
        });
        LOG.infof("CBR seed data loaded: %d incidents", incidents.size());
    }

    static List<SocIncidentCbrCase> seedIncidents() {
        return List.of(
            incident("credential-harvesting", "crowdstrike", "CRITICAL",
                "Credential harvesting via Mimikatz on endpoint",
                List.of("T1003", "T1078"), List.of("hash", "ip"),
                "CONFIRM_SEVERITY", "isolate-host", 45),
            incident("brute-force", "auth-service", "MEDIUM",
                "Multiple failed login attempts from single source",
                List.of("T1110"), List.of("ip"),
                "DOWNGRADE", "block-ip", 15),
            incident("malware-execution", "crowdstrike", "HIGH",
                "Ransomware payload executed on file server",
                List.of("T1486", "T1059"), List.of("hash", "domain"),
                "ESCALATE", "escalate-tier2", 90),
            incident("phishing", "email-gateway", "MEDIUM",
                "Suspected phishing email with malicious attachment",
                List.of("T1566"), List.of("domain", "hash"),
                "FALSE_POSITIVE", null, 10),
            incident("lateral-movement", "network-ids", "HIGH",
                "Lateral movement detected via SMB between segments",
                List.of("T1021", "T1570"), List.of("ip"),
                "CONFIRM_SEVERITY", "segment-network", 60)
        );
    }

    private static SocIncidentCbrCase incident(
            String alertType, String source, String severity, String description,
            List<String> techniques, List<String> iocTypes,
            String outcome, String playbook, long durationMinutes) {
        var features = new LinkedHashMap<String, FeatureValue>();
        features.put("alertType", FeatureValue.string(alertType));
        features.put("sourceSystem", FeatureValue.string(source));
        features.put("severity", FeatureValue.string(severity));
        features.put("alertDescription", FeatureValue.string(description));
        if (!techniques.isEmpty()) features.put("attckTechniqueIds", FeatureValue.stringList(techniques));
        if (!iocTypes.isEmpty()) features.put("iocTypes", FeatureValue.stringList(iocTypes));

        return new SocIncidentCbrCase(
            alertType + " from " + source + ": " + description,
            outcome, "COMPLETED", Confidence.unknown(0.9),
            Map.copyOf(features), null, null,
            alertType, source, techniques, iocTypes,
            outcome, outcome, playbook, durationMinutes);
    }
}
