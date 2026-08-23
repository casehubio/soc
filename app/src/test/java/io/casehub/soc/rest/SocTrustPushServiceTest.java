package io.casehub.soc.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.casehub.ledger.runtime.service.routing.TrustScoreActorUpdatedEvent;
import io.casehub.pages.push.EventBroadcaster;
import io.casehub.pages.push.InMemoryEventStore;
import io.casehub.pages.push.TopicRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SocTrustPushServiceTest {

    private InMemoryEventStore store;
    private SocTrustPushService service;

    @BeforeEach
    void setUp() {
        store = new InMemoryEventStore(100);
        var registry = new TopicRegistry();
        var mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        var broadcaster = new EventBroadcaster(store, registry, (id, msg) -> {}, mapper::writeValueAsString);
        service = new SocTrustPushService(broadcaster);
    }

    @Test
    void onTrustScoreUpdated_broadcastsToTrustTopic() {
        var event = new TrustScoreActorUpdatedEvent(
            "soc:rule-ioc-enrichment", List.of(), Instant.now());

        service.onTrustScoreUpdated(event);

        assertThat(store.topics()).contains("soc:trust");
    }
}
