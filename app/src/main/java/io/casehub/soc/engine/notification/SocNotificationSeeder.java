package io.casehub.soc.engine.notification;

import io.casehub.platform.api.notification.NotificationSeverity;
import io.casehub.platform.api.subscription.NotificationTarget;
import io.casehub.platform.api.subscription.NotificationTemplate;
import io.casehub.platform.api.subscription.SubscriptionInput;
import io.casehub.platform.api.subscription.SubscriptionQuery;
import io.casehub.platform.api.subscription.SubscriptionScope;
import io.casehub.platform.api.subscription.SubscriptionStore;
import io.casehub.platform.api.subscription.TargetType;
import io.casehub.soc.domain.SocNotificationEvents;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@ApplicationScoped
public class SocNotificationSeeder {

    private static final Logger LOG = Logger.getLogger(SocNotificationSeeder.class);
    private static final String SYSTEM_OWNER = "SYSTEM";

    private final SubscriptionStore subscriptionStore;
    private final List<String> tenants;

    @Inject
    public SocNotificationSeeder(Instance<SubscriptionStore> subscriptionStoreInstance,
                                 @ConfigProperty(name = "casehub.soc.notification.tenants",
                                     defaultValue = "default") List<String> tenants) {
        this.subscriptionStore = subscriptionStoreInstance.isUnsatisfied() ? null : subscriptionStoreInstance.get();
        this.tenants = tenants;
    }

    SocNotificationSeeder(SubscriptionStore subscriptionStore, List<String> tenants) {
        this.subscriptionStore = subscriptionStore;
        this.tenants = tenants;
    }

    void onStartup(@Observes StartupEvent event) {
        if (subscriptionStore == null) {
            LOG.warn("SubscriptionStore unavailable — SYSTEM subscriptions not seeded");
            return;
        }
        for (String tenantId : tenants) {
            seedTenant(tenantId);
        }
    }

    private void seedTenant(String tenantId) {
        var existingPage = subscriptionStore.find(new SubscriptionQuery(
            SYSTEM_OWNER, tenantId, SubscriptionScope.SYSTEM, true, null, 500));
        Map<String, io.casehub.platform.api.subscription.Subscription> existingByType =
            existingPage.subscriptions().stream()
                .collect(Collectors.toMap(
                    io.casehub.platform.api.subscription.Subscription::eventType,
                    s -> s, (a, b) -> a));

        var defaults = defaultSubscriptions(tenantId);
        int created = 0;
        int updated = 0;

        for (SubscriptionInput input : defaults) {
            var existing = existingByType.get(input.eventType());
            if (existing == null) {
                subscriptionStore.store(input);
                created++;
            } else if (!templateMatches(existing.template(), input.template())) {
                subscriptionStore.update(existing.id(), SYSTEM_OWNER, tenantId,
                    new io.casehub.platform.api.subscription.SubscriptionUpdate(
                        null, null, null, null, null, input.template(), null));
                updated++;
            }
        }

        LOG.infof("SOC notification seeding for tenant '%s': %d created, %d updated, %d unchanged",
            tenantId, created, updated, defaults.size() - created - updated);
    }

    private static boolean templateMatches(NotificationTemplate a, NotificationTemplate b) {
        return a.titlePattern().equals(b.titlePattern())
            && Objects.equals(a.bodyPattern(), b.bodyPattern())
            && a.severity() == b.severity()
            && a.category().equals(b.category())
            && Objects.equals(a.actionUrlPattern(), b.actionUrlPattern());
    }

    static List<SubscriptionInput> defaultSubscriptions(String tenantId) {
        return List.of(
            sub(tenantId, SocNotificationEvents.INCIDENT_CREATED, "Incident Created",
                template("{severity} incident — {correlationKey}",
                    "New incident. Tactic: {tactic}. Requires immediate triage.",
                    NotificationSeverity.URGENT, "soc-incident", "/soc/incidents/{caseId}",
                    "incident", "caseId", "actorId"),
                List.of(target(TargetType.GROUP, "soc-manager"),
                    target(TargetType.GROUP, "soc-on-call"))),

            sub(tenantId, SocNotificationEvents.INCIDENT_ESCALATED, "Incident Escalated",
                template("ESCALATED: incident {caseId}",
                    "Incident escalated to higher tier. Immediate attention required.",
                    NotificationSeverity.URGENT, "soc-incident", "/soc/incidents/{caseId}",
                    "incident", "caseId", "actorId"),
                List.of(target(TargetType.GROUP, "soc-manager"))),

            sub(tenantId, SocNotificationEvents.INCIDENT_RESOLVED, "Incident Resolved",
                template("Incident {caseId} resolved",
                    "Incident closed. Correlation: {correlationKey}.",
                    NotificationSeverity.INFO, "soc-incident", "/soc/incidents/{caseId}",
                    "incident", "caseId", "actorId"),
                List.of(target(TargetType.ENTITY_WATCHERS, "incident"))),

            sub(tenantId, SocNotificationEvents.INCIDENT_SLA_BREACHED, "SLA Breached",
                template("SLA BREACH: incident {caseId}",
                    "Response deadline exceeded. Escalation in progress.",
                    NotificationSeverity.URGENT, "soc-sla", "/soc/incidents/{caseId}",
                    "incident", "caseId", "actorId"),
                List.of(target(TargetType.GROUP, "soc-manager"))),

            sub(tenantId, SocNotificationEvents.WORKITEM_CREATED, "SOC Work Item Created",
                template("Action required: {title}",
                    "New SOC work item awaiting review.",
                    NotificationSeverity.URGENT, "soc-containment", "/soc/workitems/{workItemId}",
                    "workitem", "workItemId", "actorId"),
                List.of(target(TargetType.EVENT_FIELD, "candidateGroups"))),

            sub(tenantId, SocNotificationEvents.WORKITEM_ASSIGNED, "SOC Work Item Assigned",
                template("Assigned: {title}",
                    "You have been assigned a SOC investigation task.",
                    NotificationSeverity.WARNING, "soc-workitem", "/soc/workitems/{workItemId}",
                    "workitem", "workItemId", "actorId"),
                List.of(target(TargetType.EVENT_FIELD, "assigneeId"))),

            sub(tenantId, SocNotificationEvents.WORKITEM_ESCALATED, "SOC Work Item Escalated",
                template("ESCALATED: {title}",
                    "SOC work item escalated via SLA breach.",
                    NotificationSeverity.URGENT, "soc-workitem", "/soc/workitems/{workItemId}",
                    "workitem", "workItemId", "actorId"),
                List.of(target(TargetType.EVENT_FIELD, "candidateGroups"))),

            sub(tenantId, SocNotificationEvents.WORKITEM_COMPLETED, "SOC Work Item Completed",
                template("Completed: {title}",
                    "SOC work item has been completed.",
                    NotificationSeverity.INFO, "soc-workitem", "/soc/workitems/{workItemId}",
                    "workitem", "workItemId", "actorId"),
                List.of(target(TargetType.EVENT_FIELD, "assigneeId")))
        );
    }

    private static SubscriptionInput sub(String tenantId, String eventType, String name,
                                         NotificationTemplate template,
                                         List<NotificationTarget> targets) {
        return new SubscriptionInput(SYSTEM_OWNER, tenantId, name, eventType,
            List.of(), targets, false, template, true, SubscriptionScope.SYSTEM);
    }

    private static NotificationTemplate template(String title, String body,
                                                  NotificationSeverity severity,
                                                  String category, String actionUrl,
                                                  String entityType, String entityIdField,
                                                  String actorIdField) {
        return new NotificationTemplate(title, body, severity, category,
            actionUrl, entityType, entityIdField, actorIdField);
    }

    private static NotificationTarget target(TargetType type, String id) {
        return new NotificationTarget(type, id);
    }
}
