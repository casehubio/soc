package io.casehub.soc.rest;

import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.pages.push.EventBroadcaster;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocIncidentStatusChangedEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;

@ApplicationScoped
public class SocIncidentPushService {

    private final EventBroadcaster broadcaster;

    @Inject
    SocIncidentPushService(EventBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    void onCaseCreated(@ObservesAsync CaseLifecycleEvent event) {
        if (!"CaseStarted".equals(event.eventType())) return;
        if (!SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseDefinitionName())) return;
        broadcaster.broadcast("soc:incidents", event);
    }

    void onStatusChanged(@ObservesAsync SocIncidentStatusChangedEvent event) {
        broadcaster.broadcast("soc:incidents", event);
        broadcaster.broadcast("soc:kpis", event);
    }
}
