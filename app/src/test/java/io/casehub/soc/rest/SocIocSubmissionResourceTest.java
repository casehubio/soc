package io.casehub.soc.rest;

import com.fasterxml.jackson.databind.JsonNode;
import io.casehub.api.context.CaseContext;
import io.casehub.api.context.ReadableLayer;
import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.engine.common.internal.history.EventLog;
import io.casehub.platform.api.identity.CurrentPrincipal;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

class SocIocSubmissionResourceTest {

    private static final String TENANT = "test-tenant";

    private StubRepository repository;
    private SocIocSubmissionResource resource;
    private UUID incidentId;

    @BeforeEach
    void setUp() {
        repository = new StubRepository();
        var principal = new StubPrincipal(TENANT);
        resource = new SocIocSubmissionResource(repository, principal);

        incidentId = UUID.randomUUID();
        CaseInstance ci = new CaseInstance();
        ci.setUuid(incidentId);
        ci.setCaseContext(new StubCaseContext());
        repository.store(incidentId, TENANT, ci);
    }

    @Test
    void submitValidIoc_appendsAndReturns200() {
        Response resp = resource.submitIoc(incidentId, Map.of(
                "type", "IP", "value", "192.168.1.100", "confidence", 0.85));

        assertThat(resp.getStatus()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        var body = (Map<String, Object>) resp.getEntity();
        @SuppressWarnings("unchecked")
        var iocs = (List<Map<String, Object>>) body.get("iocs");
        assertThat(iocs).hasSize(1);
        assertThat(iocs.get(0).get("type")).isEqualTo("IP");
        assertThat(iocs.get(0).get("value")).isEqualTo("192.168.1.100");
        assertThat(iocs.get(0).get("confidence")).isEqualTo(0.85);
        assertThat(iocs.get(0).get("source")).isEqualTo("manual-submission");
    }

    @Test
    void submitSecondIoc_appendsToExisting() {
        resource.submitIoc(incidentId, Map.of("type", "IP", "value", "10.0.0.1", "confidence", 0.5));
        Response resp = resource.submitIoc(incidentId, Map.of("type", "HASH", "value", "abc123", "confidence", 0.9));

        @SuppressWarnings("unchecked")
        var body = (Map<String, Object>) resp.getEntity();
        @SuppressWarnings("unchecked")
        var iocs = (List<Map<String, Object>>) body.get("iocs");
        assertThat(iocs).hasSize(2);
    }

    @Test
    void submitIoc_missingType_returns400() {
        Response resp = resource.submitIoc(incidentId, Map.of("value", "192.168.1.100", "confidence", 0.85));
        assertThat(resp.getStatus()).isEqualTo(400);
    }

    @Test
    void submitIoc_invalidType_returns400() {
        Response resp = resource.submitIoc(incidentId, Map.of("type", "INVALID", "value", "x", "confidence", 0.5));
        assertThat(resp.getStatus()).isEqualTo(400);
    }

    @Test
    void submitIoc_confidenceOutOfRange_returns400() {
        Response resp = resource.submitIoc(incidentId, Map.of("type", "IP", "value", "x", "confidence", 1.5));
        assertThat(resp.getStatus()).isEqualTo(400);
    }

    @Test
    void submitIoc_negativeConfidence_returns400() {
        Response resp = resource.submitIoc(incidentId, Map.of("type", "IP", "value", "x", "confidence", -0.1));
        assertThat(resp.getStatus()).isEqualTo(400);
    }

    @Test
    void submitIoc_missingValue_returns400() {
        Response resp = resource.submitIoc(incidentId, Map.of("type", "IP", "confidence", 0.85));
        assertThat(resp.getStatus()).isEqualTo(400);
    }

    @Test
    void submitIoc_blankValue_returns400() {
        Response resp = resource.submitIoc(incidentId, Map.of("type", "IP", "value", "   ", "confidence", 0.5));
        assertThat(resp.getStatus()).isEqualTo(400);
    }

    @Test
    void submitIoc_unknownIncident_returns404() {
        Response resp = resource.submitIoc(UUID.randomUUID(), Map.of("type", "IP", "value", "x", "confidence", 0.5));
        assertThat(resp.getStatus()).isEqualTo(404);
    }

    record StubPrincipal(String tenancy) implements CurrentPrincipal {
        @Override public String actorId() { return "test-user"; }
        @Override public Set<String> groups() { return Set.of(); }
        @Override public String tenancyId() { return tenancy; }
        @Override public boolean isCrossTenantAdmin() { return false; }
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

    static class StubRepository implements CaseInstanceRepository {
        private final Map<String, CaseInstance> instances = new HashMap<>();

        void store(UUID uuid, String tenancyId, CaseInstance ci) {
            instances.put(uuid + ":" + tenancyId, ci);
        }

        @Override public CaseInstance save(CaseInstance i, String t) { return i; }
        @Override public CaseInstance update(CaseInstance i, String t) { return i; }
        @Override public CaseInstance findByUuid(UUID uuid, String tenancyId) {
            return instances.get(uuid + ":" + tenancyId);
        }
        @Override public void updateStateAndAppendEvent(CaseInstance i, EventLog e, String t) {}
    }
}
