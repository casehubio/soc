package io.casehub.soc.domain;

import io.casehub.eidos.api.AgentDescriptor;
import io.casehub.eidos.api.DispositionAxis;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SocAgentDescriptorsTest {

    @Test
    void allReturnsSevenDescriptors() {
        List<AgentDescriptor> all = SocAgentDescriptors.all();
        assertEquals(7, all.size());
    }

    @Test
    void agentIdsAreUnique() {
        var ids = new HashSet<String>();
        for (var d : SocAgentDescriptors.all()) {
            assertTrue(ids.add(d.agentId()), "Duplicate agentId: " + d.agentId());
        }
    }

    @Test
    void descriptorsByWorkerNameHasSevenEntries() {
        Map<String, AgentDescriptor> map = SocAgentDescriptors.descriptorsByWorkerName();
        assertEquals(7, map.size());
    }

    @Test
    void workerNamesMatchExpected() {
        var map = SocAgentDescriptors.descriptorsByWorkerName();
        assertTrue(map.containsKey("rule-cbr-retrieval"));
        assertTrue(map.containsKey("rule-ioc-enrichment"));
        assertTrue(map.containsKey("llm-ioc-enrichment"));
        assertTrue(map.containsKey("rule-attck-mapping"));
        assertTrue(map.containsKey("llm-attck-mapping"));
        assertTrue(map.containsKey("rule-containment-rec"));
        assertTrue(map.containsKey("llm-containment-rec"));
    }

    @Test
    void capabilityNamesMatchCaseYaml() {
        var map = SocAgentDescriptors.descriptorsByWorkerName();
        assertEquals("cbr-retrieval",
                     map.get("rule-cbr-retrieval").capabilities().getFirst().name());
        assertEquals("ioc-enrichment",
                     map.get("rule-ioc-enrichment").capabilities().getFirst().name());
        assertEquals("ioc-enrichment",
                     map.get("llm-ioc-enrichment").capabilities().getFirst().name());
        assertEquals("attck-mapping",
                     map.get("rule-attck-mapping").capabilities().getFirst().name());
        assertEquals("attck-mapping",
                     map.get("llm-attck-mapping").capabilities().getFirst().name());
        assertEquals("containment-recommendation",
                     map.get("rule-containment-rec").capabilities().getFirst().name());
        assertEquals("containment-recommendation",
                     map.get("llm-containment-rec").capabilities().getFirst().name());
    }

    @Test
    void eachDescriptorHasExactlyOneCapability() {
        for (var d : SocAgentDescriptors.all()) {
            assertEquals(1, d.capabilities().size(),
                "Descriptor " + d.agentId() + " should have exactly one capability");
        }
    }

    @Test
    void ruleBasedEpistemicDomainsAreSubsetOfTactics() {
        var allTactics = Arrays.stream(AttackTactic.values())
            .map(AttackTactic::name).collect(Collectors.toSet());
        var ruleDescriptors = List.of(
            SocAgentDescriptors.ruleIocEnrichment(),
            SocAgentDescriptors.ruleAttckMapping(),
            SocAgentDescriptors.ruleContainmentRecommendation());
        for (var d : ruleDescriptors) {
            var domains = d.capabilities().getFirst().epistemicDomains();
            assertNotNull(domains, d.agentId() + " should have epistemic domains");
            assertFalse(domains.isEmpty(), d.agentId() + " should have non-empty domains");
            for (var key : domains.keySet()) {
                assertTrue(allTactics.contains(key),
                    d.agentId() + " has unknown tactic: " + key);
                assertEquals(1.0, domains.get(key),
                    d.agentId() + " rule-based tactic should be 1.0");
            }
        }
    }

    @Test
    void llmEpistemicDomainsCoverAllTactics() {
        var llmDescriptors = List.of(
            SocAgentDescriptors.llmIocEnrichment(),
            SocAgentDescriptors.llmAttckMapping(),
            SocAgentDescriptors.llmContainmentRecommendation());
        for (var d : llmDescriptors) {
            var domains = d.capabilities().getFirst().epistemicDomains();
            assertNotNull(domains);
            assertEquals(AttackTactic.values().length, domains.size(),
                d.agentId() + " should cover all 14 tactics");
            for (var confidence : domains.values()) {
                assertEquals(0.9, confidence,
                    d.agentId() + " LLM tactic confidence should be 0.9");
            }
        }
    }

    @Test
    void ruleBasedDisposition() {
        var d = SocAgentDescriptors.ruleIocEnrichment();
        var disp = d.disposition();
        assertNotNull(disp);
        assertEquals("strict", disp.primaryTerm(DispositionAxis.RULE_FOLLOWING));
        assertEquals("none", disp.primaryTerm(DispositionAxis.AUTONOMY));
        assertEquals("averse", disp.primaryTerm(DispositionAxis.RISK_APPETITE));
        assertFalse(disp.delegation());
    }

    @Test
    void llmDisposition() {
        var d = SocAgentDescriptors.llmIocEnrichment();
        var disp = d.disposition();
        assertNotNull(disp);
        assertEquals("moderate", disp.primaryTerm(DispositionAxis.RULE_FOLLOWING));
        assertEquals("guided", disp.primaryTerm(DispositionAxis.AUTONOMY));
        assertEquals("moderate", disp.primaryTerm(DispositionAxis.RISK_APPETITE));
        assertTrue(disp.delegation());
    }

    @Test
    void allDescriptorsPassValidation() {
        for (var d : SocAgentDescriptors.all()) {
            assertDoesNotThrow(() -> {
                assertNotNull(d.agentId());
                assertNotNull(d.name());
                assertNotNull(d.slot());
                assertNotNull(d.tenancyId());
            }, "Descriptor " + d.agentId() + " has null required field");
        }
    }

    @Test
    void ruleAttckMappingCoversAllTactics() {
        var d = SocAgentDescriptors.ruleAttckMapping();
        var domains = d.capabilities().getFirst().epistemicDomains();
        assertEquals(AttackTactic.values().length, domains.size(),
            "Rule ATT&CK mapping should cover all tactics");
    }
}
