package io.casehub.soc.engine;

import io.casehub.api.engine.YamlCaseHub;
import io.casehub.soc.engine.cbr.SocCbrRetrieveService;
import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.rag.SocRagRetrieveService;
import io.casehub.soc.threatintel.attck.AttckEnrichmentService;
import io.casehub.api.model.CaseDefinition;
import io.casehub.soc.domain.SocAgentDescriptors;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class SocCaseHub extends YamlCaseHub {

    @Inject
    SocCbrRetrieveService cbrRetrieveService;

    @Inject
    ContainmentExecutor containmentExecutor;

    @Inject
    AttckEnrichmentService attckEnrichmentService;

    @Inject
    SocRagRetrieveService ragRetrieveService;

    public SocCaseHub() {
        super("soc/incident-investigation.yaml");
    }

    @Override
    protected void augment(CaseDefinition definition) {
        var descriptor = new SocInvestigationCaseDescriptor(null, cbrRetrieveService, containmentExecutor, attckEnrichmentService, ragRetrieveService);
        definition.getWorkers().addAll(descriptor.workers());
        definition.setAgentDescriptors(SocAgentDescriptors.descriptorsByWorkerName());
    }
}
