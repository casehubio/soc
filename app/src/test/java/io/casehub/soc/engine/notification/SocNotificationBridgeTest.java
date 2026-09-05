package io.casehub.soc.engine.notification;

import io.casehub.platform.api.subscription.EventTypeDescriptor;
import io.casehub.platform.api.subscription.EventTypeRegistry;
import io.casehub.soc.domain.SocIncidentStatusChangedEvent;
import io.casehub.soc.domain.SocNotificationEvents;
import io.casehub.soc.domain.notification.SocIncidentNotification;
import io.casehub.soc.domain.notification.SocWorkItemNotification;
import io.casehub.work.api.WorkItemLifecycleEvent;
import io.casehub.work.api.WorkItemStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SocNotificationBridgeTest {

    private SocNotificationBridge bridge;
    private List<Object> published;
    private Set<EventTypeDescriptor> registeredTypes;

    @BeforeEach
    void setUp() {
        published = new ArrayList<>();
        registeredTypes = new HashSet<>();
        EventTypeRegistry registry = new EventTypeRegistry() {
            @Override public void register(EventTypeDescriptor d) { registeredTypes.add(d); }
            @Override public Optional<EventTypeDescriptor> resolve(String t) { return Optional.empty(); }
            @Override public Set<EventTypeDescriptor> discover() { return registeredTypes; }
        };
        bridge = new SocNotificationBridge(registry, published::add);
    }

    @Test
    void registersAllEventTypesOnStartup() {
        bridge.onStartup(null);
        assertThat(registeredTypes).hasSize(8);
    }

    @Test
    void newIncidentPublishesCreatedEvent() {
        var caseId = UUID.randomUUID();
        bridge.onIncidentStatusChanged(statusEvent(caseId, null, "TRIAGING"));

        assertThat(published).hasSize(1);
        var n = (SocIncidentNotification) published.get(0);
        assertThat(n.type()).isEqualTo(SocNotificationEvents.INCIDENT_CREATED);
        assertThat(n.tenancyId()).isEqualTo("tenant-1");
        assertThat(n.caseId()).isEqualTo(caseId.toString());
        assertThat(n.actorId()).isEqualTo(SocNotificationEvents.ACTOR_SYSTEM);
    }

    @Test
    void escalatedIncidentPublishesEscalatedEvent() {
        bridge.onIncidentStatusChanged(statusEvent(UUID.randomUUID(), "INVESTIGATING", "ESCALATED"));

        assertThat(published).hasSize(1);
        assertThat(((SocIncidentNotification) published.get(0)).type())
            .isEqualTo(SocNotificationEvents.INCIDENT_ESCALATED);
    }

    @Test
    void resolvedIncidentPublishesResolvedEvent() {
        bridge.onIncidentStatusChanged(statusEvent(UUID.randomUUID(), "CONTAINING", "RESOLVED"));

        assertThat(published).hasSize(1);
        assertThat(((SocIncidentNotification) published.get(0)).type())
            .isEqualTo(SocNotificationEvents.INCIDENT_RESOLVED);
    }

    @Test
    void falsePositivePublishesResolvedEvent() {
        bridge.onIncidentStatusChanged(statusEvent(UUID.randomUUID(), "TRIAGING", "FALSE_POSITIVE"));

        assertThat(published).hasSize(1);
        assertThat(((SocIncidentNotification) published.get(0)).type())
            .isEqualTo(SocNotificationEvents.INCIDENT_RESOLVED);
    }

    @Test
    void intermediateTransitionIsIgnored() {
        bridge.onIncidentStatusChanged(statusEvent(UUID.randomUUID(), "TRIAGING", "INVESTIGATING"));
        assertThat(published).isEmpty();
    }

    @Test
    void containingTransitionIsIgnored() {
        bridge.onIncidentStatusChanged(statusEvent(UUID.randomUUID(), "INVESTIGATING", "CONTAINING"));
        assertThat(published).isEmpty();
    }

    @Test
    void gracefulDegradationWhenNoPublisher() {
        bridge = new SocNotificationBridge(null, e -> { throw new RuntimeException("should not be called"); });
        bridge.onStartup(null);
        // No exception — startup skipped gracefully
    }

    @Test
    void newIncidentTracksCaseId() {
        var caseId = UUID.randomUUID();
        bridge.onIncidentStatusChanged(statusEvent(caseId, null, "TRIAGING"));
        assertThat(bridge.activeSocCaseIds).contains(caseId);
    }

    @Test
    void terminalStatusRemovesCaseId() {
        var caseId = UUID.randomUUID();
        bridge.onIncidentStatusChanged(statusEvent(caseId, null, "TRIAGING"));
        bridge.onIncidentStatusChanged(statusEvent(caseId, "CONTAINING", "RESOLVED"));
        assertThat(bridge.activeSocCaseIds).doesNotContain(caseId);
    }

    @Test
    void workItemForKnownCasePublishesEvent() {
        var caseId = UUID.randomUUID();
        bridge.onIncidentStatusChanged(statusEvent(caseId, null, "TRIAGING"));
        published.clear();

        bridge.onWorkItemEvent(workItemEvent(caseId, WorkItemStatus.PENDING));

        assertThat(published).hasSize(1);
        var n = (SocWorkItemNotification) published.get(0);
        assertThat(n.type()).isEqualTo(SocNotificationEvents.WORKITEM_CREATED);
        assertThat(n.caseId()).isEqualTo(caseId.toString());
    }

    @Test
    void workItemForUnknownCaseIsIgnored() {
        bridge.onWorkItemEvent(workItemEvent(UUID.randomUUID(), WorkItemStatus.PENDING));
        assertThat(published).isEmpty();
    }

    @Test
    void workItemWithNullCallerRefIsIgnored() {
        bridge.onWorkItemEvent(WorkItemLifecycleEvent.of("created",
            testWorkItem(null), "actor", "detail"));
        assertThat(published).isEmpty();
    }

    @Test
    void assignedWorkItemMapsCorrectly() {
        var caseId = UUID.randomUUID();
        bridge.onIncidentStatusChanged(statusEvent(caseId, null, "TRIAGING"));
        published.clear();

        bridge.onWorkItemEvent(workItemEvent(caseId, WorkItemStatus.ASSIGNED));

        assertThat(published).hasSize(1);
        assertThat(((SocWorkItemNotification) published.get(0)).type())
            .isEqualTo(SocNotificationEvents.WORKITEM_ASSIGNED);
    }

    @Test
    void completedWorkItemMapsCorrectly() {
        var caseId = UUID.randomUUID();
        bridge.onIncidentStatusChanged(statusEvent(caseId, null, "TRIAGING"));
        published.clear();

        bridge.onWorkItemEvent(workItemEvent(caseId, WorkItemStatus.COMPLETED));

        assertThat(published).hasSize(1);
        assertThat(((SocWorkItemNotification) published.get(0)).type())
            .isEqualTo(SocNotificationEvents.WORKITEM_COMPLETED);
    }

    @Test
    void extractCaseIdFromValidCallerRef() {
        var id = UUID.randomUUID();
        assertThat(SocNotificationBridge.extractCaseId("case:" + id + "/pi:" + UUID.randomUUID()))
            .isEqualTo(id);
    }

    @Test
    void extractCaseIdReturnsNullForInvalidRef() {
        assertThat(SocNotificationBridge.extractCaseId(null)).isNull();
        assertThat(SocNotificationBridge.extractCaseId("invalid")).isNull();
        assertThat(SocNotificationBridge.extractCaseId("case:not-a-uuid/pi:x")).isNull();
    }

    private static SocIncidentStatusChangedEvent statusEvent(UUID caseId, String prev, String next) {
        return new SocIncidentStatusChangedEvent(caseId, "tenant-1", prev, next, Instant.now());
    }

    private static WorkItemLifecycleEvent workItemEvent(UUID caseId, WorkItemStatus status) {
        var wi = testWorkItem("case:" + caseId + "/pi:" + UUID.randomUUID(), status);
        String eventName = switch (status) {
            case PENDING -> "created";
            case ASSIGNED -> "assigned";
            case IN_PROGRESS -> "in_progress";
            case COMPLETED -> "completed";
            case ESCALATED -> "escalated";
            default -> status.name().toLowerCase();
        };
        return WorkItemLifecycleEvent.of(eventName, wi, "system", "test");
    }

    private static io.casehub.work.api.WorkItem testWorkItem(String callerRef) {
        return testWorkItem(callerRef, WorkItemStatus.PENDING);
    }

    private static io.casehub.work.api.WorkItem testWorkItem(String callerRef, WorkItemStatus status) {
        return io.casehub.work.api.WorkItem.builder()
            .id(UUID.randomUUID())
            .tenancyId("tenant-1")
            .title("Test work item")
            .status(status)
            .callerRef(callerRef)
            .candidateGroups("soc-manager")
            .build();
    }
}
