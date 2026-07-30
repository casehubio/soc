package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.AttckMappingOutput;

import java.util.List;

public final class AttckLookupTable {

    private AttckLookupTable() {}

    private record MappingRule(String rulePrefix, String iocType,
                               String technique, String tactic,
                               double confidence, String narrative) {}

    private static final List<MappingRule> RULES = List.of(
            new MappingRule("credential-harvesting", "EMAIL",
                    "T1566", "INITIAL_ACCESS", 0.85, "Phishing campaign — credential harvesting via email"),
            new MappingRule("credential-harvesting", "IP_ADDRESS",
                    "T1078", "INITIAL_ACCESS", 0.70, "Valid account compromise — credential harvesting with IP indicator"),
            new MappingRule("lateral-movement", "IP_ADDRESS",
                    "T1021", "LATERAL_MOVEMENT", 0.80, "Remote services — lateral movement via network connection"),
            new MappingRule("data-exfiltration", "URL",
                    "T1041", "EXFILTRATION", 0.75, "Exfiltration over C2 channel — data transfer to external URL"),
            new MappingRule("data-exfiltration", "DOMAIN",
                    "T1041", "EXFILTRATION", 0.75, "Exfiltration over C2 channel — data transfer to external domain"),
            new MappingRule("malware-detected", "FILE_HASH_MD5",
                    "T1204", "EXECUTION", 0.90, "User execution — malware binary detected"),
            new MappingRule("malware-detected", "FILE_HASH_SHA1",
                    "T1204", "EXECUTION", 0.90, "User execution — malware binary detected"),
            new MappingRule("malware-detected", "FILE_HASH_SHA256",
                    "T1204", "EXECUTION", 0.90, "User execution — malware binary detected")
    );

    private static final AttckMappingOutput.TechniqueEntry DEFAULT_TECHNIQUE =
            new AttckMappingOutput.TechniqueEntry("T1190", 0.50, "default — no specific rule match");

    public static AttckMappingOutput lookup(String alertRule, List<String> iocTypes) {
        MappingRule iocMatch       = null;
        MappingRule prefixFallback = null;

        for (MappingRule rule : RULES) {
            if (alertRule != null && alertRule.startsWith(rule.rulePrefix)) {
                boolean iocMatched = false;
                for (String iocType : iocTypes) {
                    if (iocType.equals(rule.iocType)) {
                        iocMatched = true;
                        if (iocMatch == null || rule.confidence > iocMatch.confidence) {
                            iocMatch = rule;
                        }
                    }
                }
                if (!iocMatched && prefixFallback == null) {
                    prefixFallback = rule;
                }
            }
        }

        MappingRule bestMatch = iocMatch != null ? iocMatch : prefixFallback;

        if (bestMatch == null) {
            return new AttckMappingOutput(
                    List.of(DEFAULT_TECHNIQUE),
                    "INITIAL_ACCESS", 0.50,
                    "No specific rule match — defaulting to exploit public-facing application");
        }

        return new AttckMappingOutput(
                List.of(new AttckMappingOutput.TechniqueEntry(
                        bestMatch.technique, bestMatch.confidence, bestMatch.narrative)),
                bestMatch.tactic, bestMatch.confidence,
                bestMatch.narrative);
    }
}
