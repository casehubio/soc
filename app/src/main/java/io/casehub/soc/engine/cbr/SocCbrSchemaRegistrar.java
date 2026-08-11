package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.cbr.CbrCaseMemoryStore;
import io.casehub.neocortex.memory.cbr.CbrFeatureSchema;
import io.casehub.neocortex.memory.cbr.FeatureField;
import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@Startup
@ApplicationScoped
public class SocCbrSchemaRegistrar {

    @Inject
    SocCbrSchemaRegistrar(CbrCaseMemoryStore store) {
        store.registerSchema(CbrFeatureSchema.of(SocIncidentCbrCase.CBR_TYPE,
            FeatureField.categorical("alertType"),
            FeatureField.categorical("sourceSystem"),
            FeatureField.categorical("severity"),
            FeatureField.semanticText("alertDescription"),
            FeatureField.categoricalList("attckTechniqueIds"),
            FeatureField.categoricalList("iocTypes"),
            FeatureField.categorical("severityOutcome"),
            FeatureField.categorical("containmentOutcome")
        ));
    }
}
