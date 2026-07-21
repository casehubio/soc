package io.casehub.soc.domain;

import io.casehub.api.spi.routing.StaticSetStrategy;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SocActionTypeTest {

    @Test
    void actionTypeStringRoundTrips() {
        for (SocActionType action : SocActionType.values()) {
            var parsed = SocActionType.fromActionType(action.actionType());
            assertTrue(parsed.isPresent(), "Failed to parse: " + action.actionType());
            assertEquals(action, parsed.get());
        }
    }

    @Test
    void unknownActionTypeReturnsEmpty() {
        assertTrue(SocActionType.fromActionType("unknown.action").isEmpty());
        assertTrue(SocActionType.fromActionType(null).isEmpty());
    }

    @Test
    void neverGateActionsAreReversible() {
        for (SocActionType action : SocActionType.values()) {
            if (action.gatePolicy() == SocActionType.GatePolicy.NEVER) {
                assertTrue(action.reversible(),
                        action + " has NEVER gate but is not reversible");
            }
        }
    }

    @Test
    void alwaysGateActionsAreIrreversible() {
        for (SocActionType action : SocActionType.values()) {
            if (action.gatePolicy() == SocActionType.GatePolicy.ALWAYS) {
                assertFalse(action.reversible(),
                        action + " has ALWAYS gate but is reversible");
            }
        }
    }

    @Test
    void alwaysGateActionsRequireApprovers() {
        for (SocActionType action : SocActionType.values()) {
            if (action.gatePolicy() == SocActionType.GatePolicy.ALWAYS) {
                var strategy = (StaticSetStrategy) action.candidateGroups();
                assertFalse(strategy.values().isEmpty(),
                        action + " has ALWAYS gate but no candidate groups");
            }
        }
    }

    @Test
    void actionTypeStringsAreDotSeparatedLowercase() {
        for (SocActionType action : SocActionType.values()) {
            String at = action.actionType();
            assertEquals(at, at.toLowerCase(), "actionType should be lowercase");
            assertFalse(at.contains("_"), "actionType should use dots not underscores");
        }
    }

    @Test
    void allActionsHaveOversightScope() {
        for (SocActionType action : SocActionType.values()) {
            assertNotNull(action.scope());
            assertTrue(action.scope().startsWith("casehubio/soc/"));
        }
    }

    @Test
    void candidateGroupsAreImmutable() {
        var action = SocActionType.ISOLATE_HOST;
        var strategy = (StaticSetStrategy) action.candidateGroups();
        assertThrows(UnsupportedOperationException.class,
                () -> strategy.values().add("hacker"));
    }
}
