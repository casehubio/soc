package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SocIncidentStatusTest {

    @Test
    void triaging_isNotTerminal() {
        assertFalse(SocIncidentStatus.TRIAGING.isTerminal());
    }

    @Test
    void investigating_isNotTerminal() {
        assertFalse(SocIncidentStatus.INVESTIGATING.isTerminal());
    }

    @Test
    void containing_isNotTerminal() {
        assertFalse(SocIncidentStatus.CONTAINING.isTerminal());
    }

    @Test
    void resolved_isTerminal() {
        assertTrue(SocIncidentStatus.RESOLVED.isTerminal());
    }

    @Test
    void escalated_isTerminal() {
        assertTrue(SocIncidentStatus.ESCALATED.isTerminal());
    }

    @Test
    void falsePositive_isTerminal() {
        assertTrue(SocIncidentStatus.FALSE_POSITIVE.isTerminal());
    }

    @Test
    void ordinalOrder_forwardProgression() {
        assertTrue(SocIncidentStatus.TRIAGING.ordinal() < SocIncidentStatus.INVESTIGATING.ordinal());
        assertTrue(SocIncidentStatus.INVESTIGATING.ordinal() < SocIncidentStatus.CONTAINING.ordinal());
        assertTrue(SocIncidentStatus.CONTAINING.ordinal() < SocIncidentStatus.RESOLVED.ordinal());
    }
}
