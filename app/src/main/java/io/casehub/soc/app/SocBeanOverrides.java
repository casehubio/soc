package io.casehub.soc.app;

import io.casehub.eidos.api.CapabilityHealth;
import io.casehub.engine.common.spi.PlanItemStore;
import io.casehub.engine.persistence.memory.InMemoryPlanItemStore;
import io.casehub.neocortex.rag.CaseContextRetriever;
import io.casehub.neocortex.rag.CaseRetriever;
import io.casehub.neocortex.rag.runtime.DedupIngestionConfig;
import io.casehub.qhorus.api.store.CrossTenantChannelStore;
import io.casehub.qhorus.api.store.CrossTenantChannelSummaryStore;
import io.quarkus.arc.DefaultBean;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Instance;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    @Produces
    @Alternative
    @Priority(200)
    @ApplicationScoped
    CrossTenantChannelStore crossTenantChannelStore() {
        return new CrossTenantChannelStore() {
            @Override public List listAll() { return List.of(); }
            @Override public Optional findById(UUID id) { return Optional.empty(); }
            @Override public Optional findByNameAndTenancy(String n, String t) { return Optional.empty(); }
        };
    }

    @Produces
    @DefaultBean
    @ApplicationScoped
    CaseContextRetriever caseContextRetriever(Instance<CaseRetriever> retriever) {
        return new CaseContextRetriever(retriever.isResolvable() ? retriever.get() : (q, c, m, f) -> List.of());
    }

    @Produces
    @DefaultBean
    @ApplicationScoped
    DedupIngestionConfig dedupIngestionConfig() {
        return new DedupIngestionConfig() {
            @Override public boolean enabled() { return false; }
            @Override public double threshold() { return 0.95; }
            @Override public Optional<String> logPath() { return Optional.empty(); }
        };
    }

    @Produces
    @Alternative
    @Priority(200)
    @ApplicationScoped
    CrossTenantChannelSummaryStore crossTenantChannelSummaryStore() {
        return new CrossTenantChannelSummaryStore() {
            @Override public List findAll() { return List.of(); }
            @Override public List findWithAutoUpdateConfigured() { return List.of(); }
        };
    }
}
