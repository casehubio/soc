package io.casehub.soc.work;

import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.work.api.WorkItemLifecycleEvent;
import io.casehub.work.api.WorkItemStatus;
import io.casehub.work.engine.CallerRef;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

@ApplicationScoped
public class SocEscalatedWorkItemHandler {

    private static final Logger LOG = Logger.getLogger(SocEscalatedWorkItemHandler.class);
    private static final String SOC_SCOPE_PREFIX = "casehubio/soc";

    private final CaseInstanceRepository repository;

    @Inject
    SocEscalatedWorkItemHandler(CaseInstanceRepository repository) {
        this.repository = repository;
    }

    public void onEscalated(@ObservesAsync WorkItemLifecycleEvent event) {
        if (event.status() != WorkItemStatus.ESCALATED) return;

        String scope = event.workItem() != null ? event.workItem().scope() : null;
        if (scope == null || !scope.startsWith(SOC_SCOPE_PREFIX)) return;

        CallerRef ref = CallerRef.parse(event.callerRef());
        if (ref == null) return;

        CaseInstance ci = repository.findByUuid(ref.caseId(), event.tenancyId());
        if (ci == null) {
            LOG.warnf("Case not found for ESCALATED WorkItem: caseId=%s", ref.caseId());
            return;
        }

        ci.getCaseContext().set("analystDecision", "escalated");
        LOG.infof("Set analystDecision=escalated for caseId=%s via ESCALATED WorkItem workItemId=%s",
                ref.caseId(), event.workItemId());
    }
}
