package io.casehub.soc.domain;

import io.casehub.platform.api.subscription.EventFieldDescriptor;
import io.casehub.platform.api.subscription.EventTypeDescriptor;

import java.util.List;

public final class SocNotificationEvents {

    private SocNotificationEvents() {}

    public static final String INCIDENT_CREATED = "io.casehub.soc.incident.created";
    public static final String INCIDENT_ESCALATED = "io.casehub.soc.incident.escalated";
    public static final String INCIDENT_RESOLVED = "io.casehub.soc.incident.resolved";
    public static final String INCIDENT_SLA_BREACHED = "io.casehub.soc.incident.sla_breached";

    public static final String WORKITEM_CREATED = "io.casehub.soc.workitem.created";
    public static final String WORKITEM_ASSIGNED = "io.casehub.soc.workitem.assigned";
    public static final String WORKITEM_ESCALATED = "io.casehub.soc.workitem.escalated";
    public static final String WORKITEM_COMPLETED = "io.casehub.soc.workitem.completed";

    public static final String ACTOR_SYSTEM = "system:soc-engine";

    private static final List<EventFieldDescriptor> INCIDENT_FIELDS = List.of(
        new EventFieldDescriptor("severity", "Severity", "string"),
        new EventFieldDescriptor("tactic", "ATT&CK Tactic", "string"),
        new EventFieldDescriptor("caseId", "Incident ID", "string"),
        new EventFieldDescriptor("correlationKey", "Affected Entity", "string"),
        new EventFieldDescriptor("assignedAnalystId", "Assigned Analyst", "string"));

    private static final List<EventFieldDescriptor> WORKITEM_FIELDS = List.of(
        new EventFieldDescriptor("workItemId", "Work Item ID", "string"),
        new EventFieldDescriptor("assigneeId", "Assignee", "string"),
        new EventFieldDescriptor("candidateGroups", "Candidate Groups", "string"),
        new EventFieldDescriptor("title", "Title", "string"),
        new EventFieldDescriptor("caseId", "Incident ID", "string"));

    public static List<EventTypeDescriptor> incidentDescriptors() {
        return List.of(
            new EventTypeDescriptor(INCIDENT_CREATED, "Incident Created",
                "New SOC incident enters triage", INCIDENT_FIELDS),
            new EventTypeDescriptor(INCIDENT_ESCALATED, "Incident Escalated",
                "SOC incident escalated to higher tier", INCIDENT_FIELDS),
            new EventTypeDescriptor(INCIDENT_RESOLVED, "Incident Resolved",
                "SOC incident resolved or classified as false positive", INCIDENT_FIELDS),
            new EventTypeDescriptor(INCIDENT_SLA_BREACHED, "SLA Breached",
                "SOC incident work item SLA breached", INCIDENT_FIELDS));
    }

    public static List<EventTypeDescriptor> workItemDescriptors() {
        return List.of(
            new EventTypeDescriptor(WORKITEM_CREATED, "SOC Work Item Created",
                "SOC investigation work item created", WORKITEM_FIELDS),
            new EventTypeDescriptor(WORKITEM_ASSIGNED, "SOC Work Item Assigned",
                "SOC investigation work item assigned to analyst", WORKITEM_FIELDS),
            new EventTypeDescriptor(WORKITEM_ESCALATED, "SOC Work Item Escalated",
                "SOC investigation work item escalated", WORKITEM_FIELDS),
            new EventTypeDescriptor(WORKITEM_COMPLETED, "SOC Work Item Completed",
                "SOC investigation work item completed", WORKITEM_FIELDS));
    }
}
