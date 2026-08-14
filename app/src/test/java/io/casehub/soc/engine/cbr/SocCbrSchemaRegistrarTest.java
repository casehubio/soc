package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.cbr.CbrFeatureSchema;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SocCbrSchemaRegistrarTest {

    @Test
    void registersSchema_withSocIncidentCbrType() {
        var store = new CapturingCbrStore();
        new SocCbrSchemaRegistrar(store);
        assertThat(store.registeredSchemas).hasSize(1);
        assertThat(store.registeredSchemas.getFirst().caseType())
            .isEqualTo(SocIncidentCbrCase.CBR_TYPE);
    }

    @Test
    void registersSchema_withExpectedFields() {
        var store = new CapturingCbrStore();
        new SocCbrSchemaRegistrar(store);
        var schema = store.registeredSchemas.getFirst();
        var fieldNames = schema.fields().stream().map(f -> f.name()).toList();
        assertThat(fieldNames).containsExactly(
            "alertType", "sourceSystem", "severity", "alertDescription",
            "attckTechniqueIds", "iocTypes", "severityOutcome", "containmentOutcome");
    }

    static class CapturingCbrStore extends StubCbrCaseMemoryStore {
        final List<CbrFeatureSchema> registeredSchemas = new ArrayList<>();
        @Override
        public void registerSchema(CbrFeatureSchema schema) {
            registeredSchemas.add(schema);
        }
    }
}
