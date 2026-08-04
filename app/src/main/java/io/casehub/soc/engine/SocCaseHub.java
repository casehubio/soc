package io.casehub.soc.engine;

import io.casehub.api.engine.YamlCaseHub;
import io.casehub.soc.domain.SocAgentDescriptors;
import io.casehub.api.model.CaseDefinition;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SocCaseHub extends YamlCaseHub {

    public SocCaseHub() {
        super("soc/incident-investigation.yaml");
    }

    @Override
    protected void augment(CaseDefinition definition) {
        var descriptor = new SocInvestigationCaseDescriptor();
        definition.getWorkers().addAll(descriptor.workers());
        definition.setAgentDescriptors(SocAgentDescriptors.descriptorsByWorkerName());
    }
}
