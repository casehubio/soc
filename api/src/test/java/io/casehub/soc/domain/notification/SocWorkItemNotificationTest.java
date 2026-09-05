package io.casehub.soc.domain.notification;

import io.casehub.platform.api.subscription.SubscribableEvent;
import io.casehub.soc.domain.SocNotificationEvents;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class SocWorkItemNotificationTest {

    @Test
    void implementsSubscribableEvent() {
        var event = workItem(SocNotificationEvents.WORKITEM_CREATED);
        assertInstanceOf(SubscribableEvent.class, event);
    }

    @Test
    void typeReturnsEventType() {
        assertEquals("io.casehub.soc.workitem.assigned",
            workItem(SocNotificationEvents.WORKITEM_ASSIGNED).type());
    }

    @Test
    void tenancyIdReturnsTenantId() {
        assertEquals("tenant-1",
            workItem(SocNotificationEvents.WORKITEM_COMPLETED).tenancyId());
    }

    @Test
    void createdEventType() {
        assertEquals(SocNotificationEvents.WORKITEM_CREATED,
            workItem(SocNotificationEvents.WORKITEM_CREATED).type());
    }

    @Test
    void assignedEventType() {
        assertEquals(SocNotificationEvents.WORKITEM_ASSIGNED,
            workItem(SocNotificationEvents.WORKITEM_ASSIGNED).type());
    }

    @Test
    void escalatedEventType() {
        assertEquals(SocNotificationEvents.WORKITEM_ESCALATED,
            workItem(SocNotificationEvents.WORKITEM_ESCALATED).type());
    }

    @Test
    void completedEventType() {
        assertEquals(SocNotificationEvents.WORKITEM_COMPLETED,
            workItem(SocNotificationEvents.WORKITEM_COMPLETED).type());
    }

    @Test
    void rejectsNullEventType() {
        assertThrows(NullPointerException.class, () ->
            new SocWorkItemNotification(null, "t", "wi", null, null,
                null, null, "system:soc-engine", Instant.now()));
    }

    @Test
    void rejectsNullTenancyId() {
        assertThrows(NullPointerException.class, () ->
            new SocWorkItemNotification(SocNotificationEvents.WORKITEM_CREATED,
                null, "wi", null, null, null, null,
                "system:soc-engine", Instant.now()));
    }

    @Test
    void rejectsNullActorId() {
        assertThrows(NullPointerException.class, () ->
            new SocWorkItemNotification(SocNotificationEvents.WORKITEM_CREATED,
                "t", "wi", null, null, null, null, null, Instant.now()));
    }

    @Test
    void allowsNullOptionalFields() {
        var event = new SocWorkItemNotification(
            SocNotificationEvents.WORKITEM_COMPLETED,
            "t", "wi", null, null, null, null,
            "system:soc-engine", Instant.now());
        assertNull(event.caseId());
        assertNull(event.title());
        assertNull(event.assigneeId());
        assertNull(event.candidateGroups());
    }

    private static SocWorkItemNotification workItem(String eventType) {
        return new SocWorkItemNotification(eventType, "tenant-1", "wi-1",
            "case-1", "Review triage", "analyst-1", "soc-manager",
            SocNotificationEvents.ACTOR_SYSTEM, Instant.now());
    }
}
