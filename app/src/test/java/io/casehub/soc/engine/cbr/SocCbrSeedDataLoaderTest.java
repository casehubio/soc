package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.CbrCase;
import io.casehub.neocortex.memory.cbr.CbrCaseMemoryStore;
import io.casehub.platform.api.path.Path;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SocCbrSeedDataLoaderTest {

    @Test
    void loads5SeedIncidents() {
        var recorder = new RecordingCbrStore();
        var loader = new SocCbrSeedDataLoader(recorder);
        loader.loadSeedData();

        assertThat(recorder.storedCases).hasSize(5);
    }

    @Test
    void seedIncidentsCoverDistinctAlertTypes() {
        var recorder = new RecordingCbrStore();
        var loader = new SocCbrSeedDataLoader(recorder);
        loader.loadSeedData();

        var alertTypes = recorder.storedCases.stream()
            .map(c -> ((SocIncidentCbrCase) c).alertType())
            .toList();
        assertThat(alertTypes).doesNotHaveDuplicates();
        assertThat(alertTypes).contains("credential-harvesting", "brute-force",
            "malware-execution", "phishing", "lateral-movement");
    }

    @Test
    void seedIncidentsHaveNonEmptyFeatures() {
        var recorder = new RecordingCbrStore();
        var loader = new SocCbrSeedDataLoader(recorder);
        loader.loadSeedData();

        recorder.storedCases.forEach(c ->
            assertThat(c.features()).as("features for %s", ((SocIncidentCbrCase) c).alertType())
                .isNotEmpty());
    }

    static class RecordingCbrStore extends StubCbrCaseMemoryStore {
        final List<CbrCase> storedCases = new ArrayList<>();

        @Override
        public String store(CbrCase c, String type, String entityId,
                MemoryDomain domain, String tenantId, String caseId, Path scope) {
            storedCases.add(c);
            return caseId;
        }
    }
}
