package io.casehub.soc.engine.notification;

import io.casehub.platform.api.notification.NotificationSeverity;
import io.casehub.platform.api.subscription.Subscription;
import io.casehub.platform.api.subscription.SubscriptionInput;
import io.casehub.platform.api.subscription.SubscriptionPage;
import io.casehub.platform.api.subscription.SubscriptionQuery;
import io.casehub.platform.api.subscription.SubscriptionScope;
import io.casehub.platform.api.subscription.SubscriptionStore;
import io.casehub.platform.api.subscription.SubscriptionUpdate;
import io.casehub.soc.domain.SocNotificationEvents;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class SocNotificationSeederTest {

    private TestSubscriptionStore store;
    private SocNotificationSeeder seeder;

    @BeforeEach
    void setUp() {
        store = new TestSubscriptionStore();
        seeder = new SocNotificationSeeder(store, List.of("tenant-1"));
    }

    @Test
    void seedsSubscriptionsForAllEventTypes() {
        seeder.onStartup(null);
        assertThat(store.stored).hasSizeGreaterThanOrEqualTo(8);
    }

    @Test
    void allSubscriptionsAreSystemScope() {
        seeder.onStartup(null);
        assertThat(store.stored).allMatch(s -> s.scope() == SubscriptionScope.SYSTEM);
    }

    @Test
    void allSubscriptionsAreEnabled() {
        seeder.onStartup(null);
        assertThat(store.stored).allMatch(SubscriptionInput::enabled);
    }

    @Test
    void coversAllIncidentEventTypes() {
        seeder.onStartup(null);
        var eventTypes = store.stored.stream().map(SubscriptionInput::eventType).toList();
        assertThat(eventTypes).contains(
            SocNotificationEvents.INCIDENT_CREATED,
            SocNotificationEvents.INCIDENT_ESCALATED,
            SocNotificationEvents.INCIDENT_RESOLVED,
            SocNotificationEvents.INCIDENT_SLA_BREACHED);
    }

    @Test
    void coversAllWorkItemEventTypes() {
        seeder.onStartup(null);
        var eventTypes = store.stored.stream().map(SubscriptionInput::eventType).toList();
        assertThat(eventTypes).contains(
            SocNotificationEvents.WORKITEM_CREATED,
            SocNotificationEvents.WORKITEM_ASSIGNED,
            SocNotificationEvents.WORKITEM_ESCALATED,
            SocNotificationEvents.WORKITEM_COMPLETED);
    }

    @Test
    void idempotentOnSecondRun() {
        seeder.onStartup(null);
        int firstCount = store.stored.size();

        store.promoteToSubscriptions();
        store.stored.clear();

        seeder.onStartup(null);
        assertThat(store.stored).isEmpty();
        assertThat(store.updated).isEmpty();
    }

    @Test
    void updatesWhenTemplateChanges() {
        seeder.onStartup(null);
        store.promoteToSubscriptions();

        var existing = store.existing.get(0);
        store.existing.set(0, mutateTemplate(existing));
        store.stored.clear();

        seeder.onStartup(null);
        assertThat(store.updated).hasSize(1);
    }

    @Test
    void seedsForMultipleTenants() {
        seeder = new SocNotificationSeeder(store, List.of("tenant-a", "tenant-b"));
        seeder.onStartup(null);

        var tenants = store.stored.stream().map(SubscriptionInput::tenancyId).distinct().toList();
        assertThat(tenants).containsExactlyInAnyOrder("tenant-a", "tenant-b");
    }

    @Test
    void nullStoreSkipsGracefully() {
        seeder = new SocNotificationSeeder((SubscriptionStore) null, List.of("tenant-1"));
        seeder.onStartup(null);
        assertThat(store.stored).isEmpty();
    }

    private static Subscription mutateTemplate(Subscription s) {
        var t = s.template();
        var changed = new io.casehub.platform.api.subscription.NotificationTemplate(
            "CHANGED: " + t.titlePattern(), t.bodyPattern(), t.severity(),
            t.category(), t.actionUrlPattern(), t.entityType(),
            t.entityIdField(), t.actorIdField());
        return new Subscription(s.id(), s.ownerId(), s.tenancyId(), s.name(),
            s.eventType(), s.filters(), s.targets(), s.includeActor(),
            changed, s.enabled(), s.scope(), s.createdAt(), s.updatedAt());
    }

    static class TestSubscriptionStore implements SubscriptionStore {
        final List<SubscriptionInput> stored = new ArrayList<>();
        final List<SubscriptionUpdate> updated = new ArrayList<>();
        final List<Subscription> existing = new ArrayList<>();

        void promoteToSubscriptions() {
            for (var input : stored) {
                existing.add(new Subscription(
                    UUID.randomUUID().toString(), input.ownerId(), input.tenancyId(),
                    input.name(), input.eventType(), input.filters(), input.targets(),
                    input.includeActor(), input.template(), input.enabled(),
                    input.scope(), Instant.now(), Instant.now()));
            }
        }

        @Override
        public Subscription store(SubscriptionInput input) {
            stored.add(input);
            return new Subscription(UUID.randomUUID().toString(), input.ownerId(),
                input.tenancyId(), input.name(), input.eventType(), input.filters(),
                input.targets(), input.includeActor(), input.template(), input.enabled(),
                input.scope(), Instant.now(), Instant.now());
        }

        @Override
        public Optional<Subscription> findById(String id, String ownerId, String tenancyId) {
            return Optional.empty();
        }

        @Override
        public SubscriptionPage find(SubscriptionQuery query) {
            var matching = existing.stream()
                .filter(s -> s.tenancyId().equals(query.tenancyId()))
                .filter(s -> s.scope() == query.scope())
                .toList();
            return new SubscriptionPage(matching, null);
        }

        @Override
        public Optional<Subscription> update(String id, String ownerId, String tenancyId,
                                              SubscriptionUpdate update) {
            updated.add(update);
            return Optional.empty();
        }

        @Override
        public boolean delete(String id, String ownerId, String tenancyId) {
            return false;
        }

        @Override
        public Stream<Subscription> findAllEnabled() {
            return existing.stream().filter(Subscription::enabled);
        }
    }
}
