package io.casehub.soc.app;

import io.casehub.eidos.api.CapabilityHealth;
import io.casehub.engine.common.spi.PlanItemStore;
import io.casehub.persistence.memory.InMemoryPlanItemStore;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

@Singleton
public class SocBeanOverrides {

    @Produces
    @Alternative
    @Priority(100)
    @ApplicationScoped
    PlanItemStore planItemStore() {
        return new InMemoryPlanItemStore();
    }

    @Produces
    @Alternative
    @Priority(100)
    @ApplicationScoped
    CapabilityHealth capabilityHealth() {
        return (descriptor, capabilityTag, context) ->
            new CapabilityHealth.CapabilityStatus.Ready();
    }
}
