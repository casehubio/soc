package io.casehub.soc.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.soc.domain.SocIncidentStatusChangedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocIncidentStatusObserverTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private SocIncidentStatusObserver observer;
    private List<SocIncidentStatusChangedEvent> firedEvents;

    @BeforeEach
    void setUp() {
        firedEvents = new ArrayList<>();
        observer = new SocIncidentStatusObserver(firedEvents::add);
    }

    @Test
    void triagingStatus_firesEvent() {
        observer.onLifecycle(lifecycleEvent("TRIAGING"));
        assertThat(firedEvents).hasSize(1);
        assertThat(firedEvents.getFirst().newStatus()).isEqualTo("TRIAGING");
        assertThat(firedEvents.getFirst().previousStatus()).isNull();
    }

    @Test
    void forwardTransition_firesEvent() {
        UUID caseId = UUID.randomUUID();
        observer.onLifecycle(lifecycleEvent(caseId, "TRIAGING"));
        observer.onLifecycle(lifecycleEvent(caseId, "INVESTIGATING"));
        assertThat(firedEvents).hasSize(2);
        assertThat(firedEvents.get(1).previousStatus()).isEqualTo("TRIAGING");
        assertThat(firedEvents.get(1).newStatus()).isEqualTo("INVESTIGATING");
    }

    @Test
    void reverseTransition_suppressed() {
        UUID caseId = UUID.randomUUID();
        observer.onLifecycle(lifecycleEvent(caseId, "INVESTIGATING"));
        observer.onLifecycle(lifecycleEvent(caseId, "TRIAGING"));
        assertThat(firedEvents).hasSize(1);
    }

    @Test
    void sameStatus_suppressed() {
        UUID caseId = UUID.randomUUID();
        observer.onLifecycle(lifecycleEvent(caseId, "TRIAGING"));
        observer.onLifecycle(lifecycleEvent(caseId, "TRIAGING"));
        assertThat(firedEvents).hasSize(1);
    }

    @Test
    void nonSocCase_ignored() {
        observer.onLifecycle(nonSocEvent("TRIAGING"));
        assertThat(firedEvents).isEmpty();
    }

    @Test
    void nullContextSnapshot_ignored() {
        var event = new CaseLifecycleEvent(UUID.randomUUID(), "t1", "cmd", "evt",
            "ACTIVE", null, null, null, "incident-investigation", "io.casehub.soc",
            null, null, null);
        observer.onLifecycle(event);
        assertThat(firedEvents).isEmpty();
    }

    @Test
    void terminalStatus_evictsFromMap() {
        UUID caseId = UUID.randomUUID();
        observer.onLifecycle(lifecycleEvent(caseId, "TRIAGING"));
        observer.onLifecycle(lifecycleEvent(caseId, "RESOLVED"));
        assertThat(firedEvents).hasSize(2);

        observer.onLifecycle(lifecycleEvent(caseId, "TRIAGING"));
        assertThat(firedEvents).hasSize(3);
    }

    @Test
    void unknownStatus_ignored() {
        ObjectNode snapshot = MAPPER.createObjectNode();
        snapshot.put("incidentStatus", "UNKNOWN_STATE");
        var event = new CaseLifecycleEvent(UUID.randomUUID(), "t1", "cmd", "evt",
            "ACTIVE", null, null, null, "incident-investigation", "io.casehub.soc",
            snapshot, null, null);
        observer.onLifecycle(event);
        assertThat(firedEvents).isEmpty();
    }

    private CaseLifecycleEvent lifecycleEvent(String incidentStatus) {
        return lifecycleEvent(UUID.randomUUID(), incidentStatus);
    }

    private CaseLifecycleEvent lifecycleEvent(UUID caseId, String incidentStatus) {
        ObjectNode snapshot = MAPPER.createObjectNode();
        snapshot.put("incidentStatus", incidentStatus);
        return new CaseLifecycleEvent(caseId, "tenant-1", "cmd", "evt",
            "ACTIVE", null, null, null, "incident-investigation", "io.casehub.soc",
            snapshot, null, null);
    }

    private CaseLifecycleEvent nonSocEvent(String incidentStatus) {
        ObjectNode snapshot = MAPPER.createObjectNode();
        snapshot.put("incidentStatus", incidentStatus);
        return new CaseLifecycleEvent(UUID.randomUUID(), "t1", "cmd", "evt",
            "ACTIVE", null, null, null, "aml-investigation", "io.casehub.aml",
            snapshot, null, null);
    }
}
