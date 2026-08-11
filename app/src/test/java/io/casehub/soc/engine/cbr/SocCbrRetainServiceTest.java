package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.CbrCase;
import io.casehub.platform.api.path.Path;
import io.casehub.soc.domain.SocCaseTypes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class SocCbrRetainServiceTest {

    private CapturingCbrStore store;
    private SocCbrRetainService service;

    @BeforeEach
    void setUp() {
        store = new CapturingCbrStore();
        service = new SocCbrRetainService(store);
    }

    @Test
    void nonSocCase_noStore() {
        var event = new CaseOutcomeEvent("aml-investigation", "t1", UUID.randomUUID(),
            Map.of(), "resolved", Instant.now(), Map.of());
        service.onOutcome(event);
        assertThat(store.storedCases).isEmpty();
    }

    @Test
    void faultedOutcome_noStore() {
        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
            UUID.randomUUID(), Map.of(), "FAULTED", Instant.now(), Map.of());
        service.onOutcome(event);
        assertThat(store.storedCases).isEmpty();
    }

    @Test
    void resolvedIncident_storesCase() {
        UUID caseId = UUID.randomUUID();
        Map<String, Object> snapshot = Map.of(
            "alert", Map.of("type", "malware", "source", "siem-1",
                            "severity", "HIGH", "description", "Ransomware"),
            "analystOutcome", "CONFIRM_SEVERITY",
            "containmentRecommendation", Map.of("playbook", "isolate", "summary", "Isolate host"));

        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "tenant-acme",
            caseId, snapshot, "resolved", Instant.parse("2026-08-11T12:00:00Z"), Map.of());

        service.onOutcome(event);

        assertThat(store.storedCases).hasSize(1);
        var stored = store.storedCases.getFirst();
        assertThat(stored.cbrCase().alertType()).isEqualTo("malware");
        assertThat(stored.tenantId()).isEqualTo("tenant-acme");
        assertThat(stored.caseId()).isEqualTo(caseId.toString());
        assertThat(stored.cbrType()).isEqualTo(SocIncidentCbrCase.CBR_TYPE);
    }

    @Test
    void falsePositiveOutcome_storesCase() {
        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
            UUID.randomUUID(),
            Map.of("alert", Map.of("type", "probe", "source", "ids"),
                   "analystOutcome", "FALSE_POSITIVE"),
            "false-positive", Instant.now(), Map.of());

        service.onOutcome(event);
        assertThat(store.storedCases).hasSize(1);
        assertThat(store.storedCases.getFirst().cbrCase().severityOutcome()).isEqualTo("FALSE_POSITIVE");
    }

    @Test
    void storeFailure_logsAndContinues() {
        var failingStore = new StubCbrCaseMemoryStore() {
            @Override
            public String store(CbrCase c, String t, String e, MemoryDomain d,
                               String tid, String cid, Path s) {
                throw new RuntimeException("Store unavailable");
            }
        };
        var svc = new SocCbrRetainService(failingStore);

        var event = new CaseOutcomeEvent(SocCaseTypes.INCIDENT_INVESTIGATION, "t1",
            UUID.randomUUID(),
            Map.of("alert", Map.of("type", "malware", "source", "siem"),
                   "analystOutcome", "CONFIRM_SEVERITY"),
            "resolved", Instant.now(), Map.of());

        svc.onOutcome(event);
    }

    static class CapturingCbrStore extends StubCbrCaseMemoryStore {
        record StoredEntry(SocIncidentCbrCase cbrCase, String cbrType,
                          String tenantId, String caseId) {}
        final List<StoredEntry> storedCases = new ArrayList<>();

        @Override
        public String store(CbrCase c, String t, String e, MemoryDomain d,
                           String tid, String cid, Path s) {
            storedCases.add(new StoredEntry((SocIncidentCbrCase) c, t, tid, cid));
            return cid;
        }
    }
}
