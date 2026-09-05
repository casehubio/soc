package io.casehub.soc.engine.notification;

import io.casehub.platform.api.subscription.EventTypeRegistry;
import io.casehub.soc.domain.SocNotificationEvents;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class SocNotificationIntegrationTest {

    @Inject
    SocNotificationBridge bridge;

    @Inject
    SocNotificationSeeder seeder;

    @Inject
    EventTypeRegistry eventTypeRegistry;

    @Test
    void bridgeBeanIsAvailable() {
        assertThat(bridge).isNotNull();
    }

    @Test
    void seederBeanIsAvailable() {
        assertThat(seeder).isNotNull();
    }

    @Test
    void eventTypeRegistryIsInjected() {
        assertThat(eventTypeRegistry).isNotNull();
    }

    @Test
    void bridgeDescriptorsAreSelfConsistent() {
        var incidentDescriptors = SocNotificationEvents.incidentDescriptors();
        assertThat(incidentDescriptors).hasSize(4);
        assertThat(incidentDescriptors.stream().map(d -> d.eventType()))
            .containsExactly(
                SocNotificationEvents.INCIDENT_CREATED,
                SocNotificationEvents.INCIDENT_ESCALATED,
                SocNotificationEvents.INCIDENT_RESOLVED,
                SocNotificationEvents.INCIDENT_SLA_BREACHED);

        var workItemDescriptors = SocNotificationEvents.workItemDescriptors();
        assertThat(workItemDescriptors).hasSize(4);
        assertThat(workItemDescriptors.stream().map(d -> d.eventType()))
            .containsExactly(
                SocNotificationEvents.WORKITEM_CREATED,
                SocNotificationEvents.WORKITEM_ASSIGNED,
                SocNotificationEvents.WORKITEM_ESCALATED,
                SocNotificationEvents.WORKITEM_COMPLETED);
    }

    @Test
    void seederDefaultSubscriptionsCoversAllEventTypes() {
        var defaults = SocNotificationSeeder.defaultSubscriptions("test-tenant");
        assertThat(defaults).hasSize(8);
        assertThat(defaults.stream().map(s -> s.eventType()))
            .contains(
                SocNotificationEvents.INCIDENT_CREATED,
                SocNotificationEvents.INCIDENT_ESCALATED,
                SocNotificationEvents.INCIDENT_RESOLVED,
                SocNotificationEvents.INCIDENT_SLA_BREACHED,
                SocNotificationEvents.WORKITEM_CREATED,
                SocNotificationEvents.WORKITEM_ASSIGNED,
                SocNotificationEvents.WORKITEM_ESCALATED,
                SocNotificationEvents.WORKITEM_COMPLETED);
    }
}
