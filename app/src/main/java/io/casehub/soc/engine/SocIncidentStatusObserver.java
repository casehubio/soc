package io.casehub.soc.engine;

import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocIncidentStatus;
import io.casehub.soc.domain.SocIncidentStatusChangedEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

@ApplicationScoped
public class SocIncidentStatusObserver {

    private static final Logger LOG = Logger.getLogger(SocIncidentStatusObserver.class);
    private final ConcurrentHashMap<UUID, SocIncidentStatus> statusByCase = new ConcurrentHashMap<>();
    private final Consumer<SocIncidentStatusChangedEvent> eventSink;

    @Inject
    SocIncidentStatusObserver(Event<SocIncidentStatusChangedEvent> statusEvent) {
        this.eventSink = statusEvent::fireAsync;
    }

    SocIncidentStatusObserver(Consumer<SocIncidentStatusChangedEvent> eventSink) {
        this.eventSink = eventSink;
    }

    void onLifecycle(@ObservesAsync CaseLifecycleEvent event) {
        if (!SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseDefinitionName())) return;
        if (event.contextSnapshot() == null) return;

        String statusText = event.contextSnapshot().path("incidentStatus").asText(null);
        if (statusText == null) return;

        SocIncidentStatus newStatus;
        try {
            newStatus = SocIncidentStatus.valueOf(statusText);
        } catch (IllegalArgumentException e) {
            LOG.warnf("Unknown incidentStatus '%s' for caseId=%s", statusText, event.caseId());
            return;
        }

        SocIncidentStatus previous = statusByCase.get(event.caseId());
        if (previous != null && newStatus.ordinal() <= previous.ordinal()) return;

        statusByCase.put(event.caseId(), newStatus);
        eventSink.accept(new SocIncidentStatusChangedEvent(
            event.caseId(), event.tenancyId(),
            previous != null ? previous.name() : null, newStatus.name(),
            Instant.now()));

        if (newStatus.isTerminal()) statusByCase.remove(event.caseId());
    }
}
