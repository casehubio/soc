package io.casehub.soc.engine;

import io.casehub.api.model.evaluator.JQExpressionEvaluator;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class SocCaseHubTest {

    @Inject
    SocCaseHub caseHub;

    @Test
    void definitionLoads() {
        var def = caseHub.getDefinition();
        assertNotNull(def);
        assertEquals("io.casehub.soc", def.getNamespace());
        assertEquals("incident-investigation", def.getName());
    }

    @Test
    void hasThreeCapabilities() {
        var names = caseHub.getDefinition().getCapabilities()
            .stream().map(c -> c.name()).toList();
        assertEquals(4, names.size());
        assertTrue(names.containsAll(List.of(
            "cbr-retrieval", "ioc-enrichment", "attck-mapping", "containment-recommendation")));
    }

    @Test
    void hasFourBindings() {
        var names = caseHub.getDefinition().getBindings()
            .stream().map(b -> b.getName()).toList();
        assertEquals(5, names.size());
        assertTrue(names.containsAll(List.of(
            "cbr-retrieval", "ioc-enrichment", "attck-mapping", "containment-recommendation", "analyst-review")));
    }

    @Test
    void hasThreeSuccessGoals() {
        var goals = caseHub.getDefinition().getGoals();
        assertEquals(3, goals.size());
        var goalNames = goals.stream().map(g -> g.getName()).toList();
        assertTrue(goalNames.containsAll(List.of("resolved", "escalated", "false-positive")));
    }

    @Test
    void resolvedGoalChecksAnalystDecision() {
        var resolved = caseHub.getDefinition().getGoals().stream()
            .filter(g -> "resolved".equals(g.getName()))
            .findFirst()
            .orElseThrow();
        assertTrue(resolved.getCondition() instanceof JQExpressionEvaluator jq
                && jq.expression().contains("analystDecision"),
            "Goal condition should check analystDecision");
    }

    @Test
    void agentDescriptorsWiredForAllWorkers() {
        var def = caseHub.getDefinition();
        var workerNames = def.getWorkers().stream()
                             .map(w -> w.name()).toList();
        for (var name : workerNames) {
            assertTrue(def.agentDescriptorFor(name).isPresent(),
                       "Missing descriptor for worker: " + name);
        }
    }

    @Test
    void agentDescriptorAbsentForUnknownWorker() {
        var def = caseHub.getDefinition();
        assertTrue(def.agentDescriptorFor("nonexistent").isEmpty());
    }

    @Test
    void descriptorCapabilityNamesMatchDefinitionCapabilities() {
        var def = caseHub.getDefinition();
        var capNames = def.getCapabilities().stream()
                          .map(c -> c.name()).collect(Collectors.toSet());
        for (var worker : def.getWorkers()) {
            var descriptor = def.agentDescriptorFor(worker.name());
            if (descriptor.isPresent()) {
                var descCap = descriptor.get().capabilities().getFirst().name();
                assertTrue(capNames.contains(descCap),
                           "Descriptor capability '" + descCap + "' for worker '" + worker.name()
                           + "' not in case definition capabilities: " + capNames);
            }
        }
    }
}
