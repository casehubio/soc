package io.casehub.soc.engine.notification;

import io.casehub.platform.api.datasource.DataSourceRegistry;
import io.casehub.platform.api.subscription.EventTypeRegistry;
import io.casehub.soc.domain.SocIncidentStatus;
import io.casehub.soc.domain.SocIncidentStatusChangedEvent;
import io.casehub.soc.domain.SocNotificationEvents;
import io.casehub.soc.domain.notification.SocIncidentNotification;
import io.casehub.soc.domain.notification.SocWorkItemNotification;
import io.casehub.work.api.WorkItemLifecycleEvent;
import io.casehub.work.api.WorkItemStatus;
import io.casehub.work.runtime.event.SlaBreachEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.enterprise.event.TransactionPhase;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

import static io.casehub.platform.api.subscription.SubscriptionConstants.NOTIFICATION_DATASOURCE_PATH;

@ApplicationScoped
public class SocNotificationBridge {

    private static final Logger LOG = Logger.getLogger(SocNotificationBridge.class);
    private static final String CASE_PREFIX = "case:";

    private final DataSourceRegistry dataSourceRegistry;
    private final EventTypeRegistry eventTypeRegistry;
    private final Consumer<Object> publisher;
    final Set<UUID> activeSocCaseIds = ConcurrentHashMap.newKeySet();

    @Inject
    public SocNotificationBridge(Instance<DataSourceRegistry> dataSourceRegistryInstance,
                                 Instance<EventTypeRegistry> eventTypeRegistryInstance) {
        this.dataSourceRegistry = dataSourceRegistryInstance.isUnsatisfied() ? null : dataSourceRegistryInstance.get();
        this.eventTypeRegistry = eventTypeRegistryInstance.isUnsatisfied() ? null : eventTypeRegistryInstance.get();
        this.publisher = this::publishToDataSource;
    }

    SocNotificationBridge(EventTypeRegistry eventTypeRegistry, Consumer<Object> publisher) {
        this.dataSourceRegistry = null;
        this.eventTypeRegistry = eventTypeRegistry;
        this.publisher = publisher;
    }

    void onStartup(@Observes StartupEvent event) {
        if (eventTypeRegistry == null) {
            LOG.warn("EventTypeRegistry unavailable — SOC notification event types not registered");
            return;
        }
        SocNotificationEvents.incidentDescriptors().forEach(eventTypeRegistry::register);
        SocNotificationEvents.workItemDescriptors().forEach(eventTypeRegistry::register);
        LOG.info("SOC notification event types registered (8 types)");
    }

    void onIncidentStatusChanged(@ObservesAsync SocIncidentStatusChangedEvent event) {
        String eventType = mapIncidentStatus(event.previousStatus(), event.newStatus());

        if (event.previousStatus() == null) {
            activeSocCaseIds.add(event.caseId());
        }
        if (isTerminal(event.newStatus())) {
            activeSocCaseIds.remove(event.caseId());
        }

        if (eventType == null) return;

        publish(new SocIncidentNotification(
            eventType, event.tenancyId(), event.caseId().toString(),
            null, null, null,
            SocNotificationEvents.ACTOR_SYSTEM, null, event.occurredAt()));
    }

    void onSlaBreach(@Observes(during = TransactionPhase.AFTER_SUCCESS) SlaBreachEvent event) {
        var task = event.context().task();
        UUID caseId = extractCaseId(task.callerRef());
        if (caseId == null || !activeSocCaseIds.contains(caseId)) return;

        publish(new SocIncidentNotification(
            SocNotificationEvents.INCIDENT_SLA_BREACHED,
            event.tenancyId(), caseId.toString(),
            null, null, null,
            SocNotificationEvents.ACTOR_SYSTEM, null, Instant.now()));
    }

    void onWorkItemEvent(@Observes(during = TransactionPhase.AFTER_SUCCESS) WorkItemLifecycleEvent event) {
        String callerRef = event.callerRef();
        if (callerRef == null) return;

        UUID caseId = extractCaseId(callerRef);
        if (caseId == null || !activeSocCaseIds.contains(caseId)) return;

        String eventType = mapWorkItemStatus(event.status());
        if (eventType == null) return;

        publish(new SocWorkItemNotification(
            eventType, event.tenancyId(),
            event.workItemId() != null ? event.workItemId().toString() : event.subject(),
            caseId.toString(), null, event.assigneeId(),
            event.candidateGroups(), SocNotificationEvents.ACTOR_SYSTEM, Instant.now()));
    }

    private void publish(Object event) {
        publisher.accept(event);
    }

    private void publishToDataSource(Object event) {
        if (dataSourceRegistry == null) {
            LOG.debug("DataSourceRegistry unavailable — notification not published");
            return;
        }
        dataSourceRegistry
            .resolveSource(NOTIFICATION_DATASOURCE_PATH, "platform")
            .ifPresent(ds -> {
                @SuppressWarnings("unchecked")
                var typed = (io.casehub.platform.api.datasource.DataSource<Object>) ds;
                typed.add(event);
            });
    }

    private static String mapIncidentStatus(String previousStatus, String newStatus) {
        if (previousStatus == null) return SocNotificationEvents.INCIDENT_CREATED;
        return switch (newStatus) {
            case "ESCALATED" -> SocNotificationEvents.INCIDENT_ESCALATED;
            case "RESOLVED", "FALSE_POSITIVE" -> SocNotificationEvents.INCIDENT_RESOLVED;
            default -> null;
        };
    }

    private static String mapWorkItemStatus(WorkItemStatus status) {
        return switch (status) {
            case PENDING -> SocNotificationEvents.WORKITEM_CREATED;
            case ASSIGNED, IN_PROGRESS -> SocNotificationEvents.WORKITEM_ASSIGNED;
            case ESCALATED -> SocNotificationEvents.WORKITEM_ESCALATED;
            case COMPLETED -> SocNotificationEvents.WORKITEM_COMPLETED;
            default -> null;
        };
    }

    private static boolean isTerminal(String status) {
        try {
            return SocIncidentStatus.valueOf(status).isTerminal();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    static UUID extractCaseId(String callerRef) {
        if (callerRef == null || !callerRef.startsWith(CASE_PREFIX)) return null;
        int end = callerRef.indexOf("/pi:");
        if (end < 0) end = callerRef.length();
        try {
            return UUID.fromString(callerRef.substring(CASE_PREFIX.length(), end));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
