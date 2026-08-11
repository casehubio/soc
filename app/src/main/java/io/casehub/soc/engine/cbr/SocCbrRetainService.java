package io.casehub.soc.engine.cbr;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.api.spi.CaseOutcomeObserver;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.CbrCaseMemoryStore;
import io.casehub.platform.api.path.Path;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

@ApplicationScoped
public class SocCbrRetainService implements CaseOutcomeObserver {

    private static final Logger LOG = Logger.getLogger(SocCbrRetainService.class);
    private static final MemoryDomain DOMAIN = new MemoryDomain("soc-incidents");
    private static final Path SCOPE = Path.of("casehubio", "soc", "incident-investigation");

    private final CbrCaseMemoryStore cbrStore;

    @Inject
    SocCbrRetainService(CbrCaseMemoryStore cbrStore) {
        this.cbrStore = cbrStore;
    }

    @Override
    public void onOutcome(CaseOutcomeEvent event) {
        if (!SocCaseOutcomeFilter.isSuccessfulIncidentInvestigation(event)) return;
        try {
            retain(event);
        } catch (Exception e) {
            LOG.warnf(e, "CBR retain failed for caseId=%s — incident not stored for future retrieval",
                event.caseId());
        }
    }

    void retain(CaseOutcomeEvent event) {
        var cbrCase = SocIncidentCbrCase.fromSnapshot(event.caseFileSnapshot(), event);
        String caseId = event.caseId().toString();
        cbrStore.store(cbrCase, SocIncidentCbrCase.CBR_TYPE, caseId, DOMAIN,
            event.tenancyId(), caseId, SCOPE);
        LOG.infof("CBR retained soc-incident caseId=%s tenant=%s", caseId, event.tenancyId());
    }
}
