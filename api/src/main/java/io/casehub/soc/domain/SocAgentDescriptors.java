package io.casehub.soc.domain;

import io.casehub.eidos.api.AgentCapability;
import io.casehub.eidos.api.AgentDescriptor;
import io.casehub.eidos.api.AgentDisposition;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class SocAgentDescriptors {

    private static final String SLOT = "incident-investigation";
    private static final String TENANCY = "default";
    private static final String VERSION = "1.0.0";
    private static final String PROVIDER = "casehub-soc";

    private static final Map<String, Double> ALL_TACTICS_09 =
        Arrays.stream(AttackTactic.values())
            .collect(Collectors.toUnmodifiableMap(AttackTactic::name, t -> 0.9));

    private SocAgentDescriptors() {}


    public static AgentDescriptor ruleCbrRetrieval() {
        return ruleDescriptor("rule-cbr-retrieval", "Rule-Based CBR Retrieval",
                              "cbr-retrieval", 0.95,
                              Map.of());
    }

    public static AgentDescriptor ruleIocEnrichment() {
        return ruleDescriptor("rule-ioc-enrichment", "Rule-Based IOC Enrichment",
            "ioc-enrichment", 0.95,
            Map.of(
                AttackTactic.INITIAL_ACCESS.name(), 1.0,
                AttackTactic.EXECUTION.name(), 1.0,
                AttackTactic.COMMAND_AND_CONTROL.name(), 1.0,
                AttackTactic.EXFILTRATION.name(), 1.0));
    }

    public static AgentDescriptor llmIocEnrichment() {
        return llmDescriptor("llm-ioc-enrichment", "LLM IOC Enrichment",
            "ioc-enrichment", 0.85);
    }

    public static AgentDescriptor ruleAttckMapping() {
        Map<String, Double> allTactics = Arrays.stream(AttackTactic.values())
            .collect(Collectors.toUnmodifiableMap(AttackTactic::name, t -> 1.0));
        return ruleDescriptor("rule-attck-mapping", "Rule-Based ATT&CK Mapping",
            "attck-mapping", 0.95, allTactics);
    }

    public static AgentDescriptor llmAttckMapping() {
        return llmDescriptor("llm-attck-mapping", "LLM ATT&CK Mapping",
            "attck-mapping", 0.85);
    }

    public static AgentDescriptor ruleContainmentRecommendation() {
        return ruleDescriptor("rule-containment-rec", "Rule-Based Containment Recommendation",
            "containment-recommendation", 0.95,
            Map.of(
                AttackTactic.INITIAL_ACCESS.name(), 1.0,
                AttackTactic.LATERAL_MOVEMENT.name(), 1.0,
                AttackTactic.EXECUTION.name(), 1.0,
                AttackTactic.PERSISTENCE.name(), 1.0,
                AttackTactic.COMMAND_AND_CONTROL.name(), 1.0));
    }

    public static AgentDescriptor llmContainmentRecommendation() {
        return llmDescriptor("llm-containment-rec", "LLM Containment Recommendation",
            "containment-recommendation", 0.85);
    }

    public static AgentDescriptor ruleContainmentExecution() {
        return ruleDescriptor("rule-containment-exec", "Rule-Based Containment Execution",
            "containment-execution", 0.95,
            Map.of());
    }

    public static List<AgentDescriptor> all() {
        return List.of(
                ruleCbrRetrieval(),
                ruleIocEnrichment(), llmIocEnrichment(),
                ruleAttckMapping(), llmAttckMapping(),
                ruleContainmentRecommendation(), llmContainmentRecommendation(),
                ruleContainmentExecution());
    }

    public static Map<String, AgentDescriptor> descriptorsByWorkerName() {
        var map = new LinkedHashMap<String, AgentDescriptor>();
        map.put("rule-cbr-retrieval", ruleCbrRetrieval());
        map.put("rule-ioc-enrichment", ruleIocEnrichment());
        map.put("llm-ioc-enrichment", llmIocEnrichment());
        map.put("rule-attck-mapping", ruleAttckMapping());
        map.put("llm-attck-mapping", llmAttckMapping());
        map.put("rule-containment-rec", ruleContainmentRecommendation());
        map.put("llm-containment-rec", llmContainmentRecommendation());
        map.put("rule-containment-exec", ruleContainmentExecution());
        return Map.copyOf(map);
    }

    private static AgentDescriptor ruleDescriptor(String agentId, String name,
            String capabilityName, double qualityHint, Map<String, Double> epistemicDomains) {
        return AgentDescriptor.builder()
            .agentId("soc:" + agentId).name(name).slot(SLOT).tenancyId(TENANCY)
            .version(VERSION).provider(PROVIDER)
            .capabilities(List.of(
                AgentCapability.builder()
                    .name(capabilityName).qualityHint(qualityHint)
                    .epistemicDomains(epistemicDomains)
                    .build()))
            .disposition(AgentDisposition.builder()
                .ruleFollowing("strict").autonomy("none")
                .riskAppetite("averse").delegation(false)
                .build())
            .build();
    }

    private static AgentDescriptor llmDescriptor(String agentId, String name,
            String capabilityName, double qualityHint) {
        return AgentDescriptor.builder()
            .agentId("soc:" + agentId).name(name).slot(SLOT).tenancyId(TENANCY)
            .version(VERSION).provider(PROVIDER).modelFamily("anthropic")
            .capabilities(List.of(
                AgentCapability.builder()
                    .name(capabilityName).qualityHint(qualityHint)
                    .epistemicDomains(ALL_TACTICS_09)
                    .build()))
            .disposition(AgentDisposition.builder()
                .ruleFollowing("moderate").autonomy("guided")
                .riskAppetite("moderate").delegation(true)
                .build())
            .build();
    }
}
