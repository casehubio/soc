package io.casehub.soc.rest;

import io.casehub.ledger.runtime.service.routing.TrustScoreActorUpdatedEvent;
import io.casehub.pages.push.EventBroadcaster;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;

@ApplicationScoped
public class SocTrustPushService {

    private final EventBroadcaster broadcaster;

    @Inject
    SocTrustPushService(EventBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    void onTrustScoreUpdated(@ObservesAsync TrustScoreActorUpdatedEvent event) {
        broadcaster.broadcast("soc:trust", event);
    }
}
