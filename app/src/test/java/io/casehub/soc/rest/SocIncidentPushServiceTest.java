package io.casehub.soc.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.casehub.pages.push.EventBroadcaster;
import io.casehub.pages.push.InMemoryEventStore;
import io.casehub.pages.push.TopicRegistry;
import io.casehub.soc.domain.SocIncidentStatusChangedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocIncidentPushServiceTest {

    private InMemoryEventStore store;
    private SocIncidentPushService service;

    @BeforeEach
    void setUp() {
        store = new InMemoryEventStore(100);
        var registry = new TopicRegistry();
        var mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        var broadcaster = new EventBroadcaster(store, registry, (id, msg) -> {}, mapper::writeValueAsString);
        service = new SocIncidentPushService(broadcaster);
    }

    @Test
    void onStatusChanged_broadcastsToIncidentsAndKpis() {
        var event = new SocIncidentStatusChangedEvent(
                UUID.randomUUID(), "test-tenant",
                "TRIAGING", "INVESTIGATING", Instant.now());

        service.onStatusChanged(event);

        assertThat(store.topics()).contains("soc:incidents", "soc:kpis");
    }
}
