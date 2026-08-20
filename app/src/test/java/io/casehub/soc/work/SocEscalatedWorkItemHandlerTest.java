package io.casehub.soc.work;

import com.fasterxml.jackson.databind.JsonNode;
import io.casehub.api.context.CaseContext;
import io.casehub.api.context.ReadableLayer;
import io.casehub.api.context.Subscription;
import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.engine.common.spi.query.CaseInstanceQuery;
import io.casehub.engine.common.internal.history.EventLog;
import io.casehub.api.model.CaseStatus;
import io.casehub.work.api.WorkItem;
import io.casehub.work.api.WorkItemLifecycleEvent;
import io.casehub.work.api.WorkItemStatus;
import io.casehub.work.engine.PlanItemCallerRef;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.function.Consumer;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

class SocEscalatedWorkItemHandlerTest {

    private StubCaseInstanceRepository repository;
    private SocEscalatedWorkItemHandler handler;

    @BeforeEach
    void setUp() {
        repository = new StubCaseInstanceRepository();
        handler = new SocEscalatedWorkItemHandler(repository);
    }

    @Test
    void escalatedSocWorkItem_setsAnalystDecision() {
        UUID caseId = UUID.randomUUID();
        CaseInstance ci = new CaseInstance();
        StubCaseContext ctx = new StubCaseContext();
        ci.setCaseContext(ctx);
        repository.store(caseId, "tenant-1", ci);

        var event = buildEvent(WorkItemStatus.ESCALATED, "casehubio/soc/triage-review/p1",
                caseId, "tenant-1");

        handler.onEscalated(event);

        assertThat(ctx.getString("analystDecision")).isEqualTo("escalated");
    }

    @Test
    void nonEscalatedEvent_ignored() {
        var event = buildEvent(WorkItemStatus.COMPLETED, "casehubio/soc/triage-review/p1",
                UUID.randomUUID(), "tenant-1");

        handler.onEscalated(event);

        assertThat(repository.lookupCount).isZero();
    }

    @Test
    void nonSocScope_ignored() {
        var event = buildEvent(WorkItemStatus.ESCALATED, "casehubio/aml/review/p1",
                UUID.randomUUID(), "tenant-1");

        handler.onEscalated(event);

        assertThat(repository.lookupCount).isZero();
    }

    @Test
    void nullScope_ignored() {
        var event = buildEvent(WorkItemStatus.ESCALATED, null,
                UUID.randomUUID(), "tenant-1");

        handler.onEscalated(event);

        assertThat(repository.lookupCount).isZero();
    }

    @Test
    void caseNotFound_noException() {
        UUID caseId = UUID.randomUUID();

        var event = buildEvent(WorkItemStatus.ESCALATED, "casehubio/soc/triage-review/p1",
                caseId, "tenant-1");

        handler.onEscalated(event);

        assertThat(repository.lookupCount).isEqualTo(1);
    }

    @Test
    void nonParsableCallerRef_ignored() {
        WorkItem workItem = WorkItem.builder()
                .id(UUID.randomUUID())
                .status(WorkItemStatus.ESCALATED)
                .scope("casehubio/soc/triage-review/p1")
                .callerRef("garbage-ref")
                .tenancyId("tenant-1")
                .candidateGroups("soc-tier1-analyst")
                .build();
        var event = WorkItemLifecycleEvent.of("escalated", workItem, "system", "SLA exhausted");

        handler.onEscalated(event);

        assertThat(repository.lookupCount).isZero();
    }

    private WorkItemLifecycleEvent buildEvent(WorkItemStatus status, String scope,
                                               UUID caseId, String tenancyId) {
        String callerRef = PlanItemCallerRef.encode(caseId, UUID.randomUUID().toString());
        WorkItem workItem = WorkItem.builder()
                .id(UUID.randomUUID())
                .status(status)
                .scope(scope)
                .callerRef(callerRef)
                .tenancyId(tenancyId)
                .candidateGroups("soc-tier1-analyst")
                .build();
        return WorkItemLifecycleEvent.of("escalated", workItem, "system", "SLA exhausted");
    }

    static class StubCaseInstanceRepository implements CaseInstanceRepository {
        private final Map<String, CaseInstance> instances = new HashMap<>();
        int lookupCount;

        void store(UUID uuid, String tenancyId, CaseInstance ci) {
            instances.put(uuid + ":" + tenancyId, ci);
        }

        @Override public CaseInstance save(CaseInstance instance, String tenancyId) { return instance; }
        @Override public CaseInstance update(CaseInstance instance, String tenancyId) { return instance; }
        @Override public CaseInstance findByUuid(UUID uuid, String tenancyId) {
            lookupCount++;
            return instances.get(uuid + ":" + tenancyId);
        }
        @Override public void updateStateAndAppendEvent(CaseInstance instance, EventLog eventLog, String tenancyId) {}
    }

    static class StubCaseContext implements CaseContext {
        private final Map<String, Object> data = new HashMap<>();

        @Override public ReadableLayer layer(String name) { throw new UnsupportedOperationException(); }
        @Override public Map<String, Object> getData() { return Collections.unmodifiableMap(data); }
        @Override public CaseContext set(String key, Object value) { data.put(key, value); return this; }
        @Override public Object get(String key) { return data.get(key); }
        @Override public <T> T getAs(String key, Class<T> type) { return type.cast(data.get(key)); }
        @Override public <T> T getOrDefault(String key, T defaultValue) { return data.containsKey(key) ? (T) data.get(key) : defaultValue; }
        @Override public Object computeIfAbsent(String key, Function<String, Object> fn) { return data.computeIfAbsent(key, fn); }
        @Override public Object putIfAbsent(String key, Object value) { return data.putIfAbsent(key, value); }
        @Override public boolean compareAndSet(String key, Object expected, Object newValue) { if (Objects.equals(data.get(key), expected)) { data.put(key, newValue); return true; } return false; }
        @Override public CaseContext update(String key, Function<Object, Object> fn) { data.put(key, fn.apply(data.get(key))); return this; }
        @Override public String getString(String key) { Object v = data.get(key); return v instanceof String s ? s : null; }
        @Override public Integer getInt(String key) { return null; }
        @Override public Long getLong(String key) { return null; }
        @Override public Double getDouble(String key) { return null; }
        @Override public Boolean getBoolean(String key) { return null; }
        @Override public <T> List<T> getList(String key, Class<T> elementType) { return List.of(); }
        @Override public Object getPath(String path) { return null; }
        @Override public String getPathAsString(String path) { return null; }
        @Override public CaseContext setPath(String path, Object value) { return this; }
        @Override public Optional<JsonNode> applyAndDiff(String path, Object value) { return Optional.empty(); }
        @Override public CaseContext setAll(Map<String, Object> values) { data.putAll(values); return this; }
        @Override public Map<String, Object> getAll(String... keys) { return Map.of(); }
        @Override public boolean contains(String key) { return data.containsKey(key); }
        @Override public CaseContext remove(String key) { data.remove(key); return this; }
        @Override public CaseContext clear() { data.clear(); return this; }
        @Override public Set<String> getKeys() { return data.keySet(); }
        @Override public boolean isEmpty() { return data.isEmpty(); }
        @Override public int size() { return data.size(); }
        @Override public JsonNode asJsonNode() { return null; }
        @Override public CaseContext merge(CaseContext other) { return this; }
        @Override public CaseContext snapshot() { return this; }
        @Override public JsonNode diff(CaseContext other) { return null; }
        @Override public void applyDiff(JsonNode diff) {}
        @Override public long getVersion() { return 0; }
    }
}
