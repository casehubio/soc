package io.casehub.soc.domain.notification;

import io.casehub.platform.api.subscription.SubscribableEvent;
import io.casehub.soc.domain.SocNotificationEvents;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class SocIncidentNotificationTest {

    @Test
    void implementsSubscribableEvent() {
        var event = incident(SocNotificationEvents.INCIDENT_CREATED);
        assertInstanceOf(SubscribableEvent.class, event);
    }

    @Test
    void typeReturnsEventType() {
        assertEquals("io.casehub.soc.incident.escalated",
            incident(SocNotificationEvents.INCIDENT_ESCALATED).type());
    }

    @Test
    void tenancyIdReturnsTenantId() {
        assertEquals("tenant-1",
            incident(SocNotificationEvents.INCIDENT_CREATED).tenancyId());
    }

    @Test
    void createdEventType() {
        assertEquals(SocNotificationEvents.INCIDENT_CREATED,
            incident(SocNotificationEvents.INCIDENT_CREATED).type());
    }

    @Test
    void escalatedEventType() {
        assertEquals(SocNotificationEvents.INCIDENT_ESCALATED,
            incident(SocNotificationEvents.INCIDENT_ESCALATED).type());
    }

    @Test
    void resolvedEventType() {
        assertEquals(SocNotificationEvents.INCIDENT_RESOLVED,
            incident(SocNotificationEvents.INCIDENT_RESOLVED).type());
    }

    @Test
    void slaBreachedEventType() {
        assertEquals(SocNotificationEvents.INCIDENT_SLA_BREACHED,
            incident(SocNotificationEvents.INCIDENT_SLA_BREACHED).type());
    }

    @Test
    void rejectsNullEventType() {
        assertThrows(NullPointerException.class, () ->
            new SocIncidentNotification(null, "t", "c", "P1", null, "h",
                "system:soc-engine", null, Instant.now()));
    }

    @Test
    void rejectsNullTenancyId() {
        assertThrows(NullPointerException.class, () ->
            new SocIncidentNotification(SocNotificationEvents.INCIDENT_CREATED,
                null, "c", "P1", null, "h",
                "system:soc-engine", null, Instant.now()));
    }

    @Test
    void rejectsNullCaseId() {
        assertThrows(NullPointerException.class, () ->
            new SocIncidentNotification(SocNotificationEvents.INCIDENT_CREATED,
                "t", null, "P1", null, "h",
                "system:soc-engine", null, Instant.now()));
    }

    @Test
    void rejectsNullActorId() {
        assertThrows(NullPointerException.class, () ->
            new SocIncidentNotification(SocNotificationEvents.INCIDENT_CREATED,
                "t", "c", "P1", null, "h", null, null, Instant.now()));
    }

    @Test
    void allowsNullOptionalFields() {
        var event = new SocIncidentNotification(
            SocNotificationEvents.INCIDENT_RESOLVED,
            "t", "c", null, null, null,
            "system:soc-engine", null, Instant.now());
        assertNull(event.severity());
        assertNull(event.tactic());
        assertNull(event.correlationKey());
        assertNull(event.assignedAnalystId());
    }

    private static SocIncidentNotification incident(String eventType) {
        return new SocIncidentNotification(eventType, "tenant-1", "case-1",
            "P1", "credential-access", "server-042",
            SocNotificationEvents.ACTOR_SYSTEM, "analyst-1", Instant.now());
    }
}
