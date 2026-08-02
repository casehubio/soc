package io.casehub.soc.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.casehub.api.model.CaseStatus;
import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.api.spi.CaseOutcomeObserver;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.work.api.Outcome;
import io.casehub.work.api.WorkItemCreateRequest;
import io.casehub.work.api.WorkItemPriority;
import io.casehub.work.api.spi.WorkItemCreator;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import org.jboss.logging.Logger;

@ApplicationScoped
public class SocFaultedCaseReviewCreator implements CaseOutcomeObserver {

    private static final Logger LOG = Logger.getLogger(SocFaultedCaseReviewCreator.class);

    private static final List<Outcome> PERMITTED_OUTCOMES = List.of(
            new Outcome("acknowledged", "Acknowledged", null),
            new Outcome("escalated", "Escalated", null));

    private final WorkItemCreator workItemCreator;
    private final ObjectMapper objectMapper;

    @Inject
    SocFaultedCaseReviewCreator(final WorkItemCreator workItemCreator, final ObjectMapper objectMapper) {
        this.workItemCreator = workItemCreator;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onOutcome(final CaseOutcomeEvent event) {
        if (!CaseStatus.FAULTED.name().equals(event.outcomeLabel())) {
            return;
        }
        if (!SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseType())) {
            return;
        }
        QuarkusTransaction.requiringNew().run(() -> processOutcome(event));
    }

    void processOutcome(final CaseOutcomeEvent event) {
        final String callerRef = "case-faulted:" + event.caseId();
        if (workItemCreator.findActiveByCallerRef(callerRef).isPresent()) {
            LOG.infof("Failure-review WorkItem already exists for caseId=%s — skipping", event.caseId());
            return;
        }
        final WorkItemCreateRequest request = buildRequest(event, callerRef);
        workItemCreator.create(request);
        LOG.infof("Created failure-review WorkItem for caseId=%s callerRef=%s", event.caseId(), callerRef);
    }

    private WorkItemCreateRequest buildRequest(final CaseOutcomeEvent event, final String callerRef) {
        final WorkItemPriority priority = derivePriority(event.caseFileSnapshot());
        final String title = deriveTitle(event.caseFileSnapshot(), priority);
        final String payload = serializePayload(event.caseFileSnapshot());

        return WorkItemCreateRequest.builder()
                .title(title)
                .priority(priority)
                .candidateGroups("soc-tier2-analyst")
                .payload(payload)
                .callerRef(callerRef)
                .createdBy("system:soc-failure-review")
                .tenancyId(event.tenancyId())
                .permittedOutcomes(PERMITTED_OUTCOMES)
                .build();
    }

    private WorkItemPriority derivePriority(final Map<String, Object> snapshot) {
        final Object alertObj = snapshot.get("alert");
        if (alertObj instanceof Map<?, ?> alert) {
            final Object severity = alert.get("severity");
            if (severity instanceof String s) {
                return switch (s) {
                    case "CRITICAL" -> WorkItemPriority.URGENT;
                    case "HIGH" -> WorkItemPriority.HIGH;
                    case "MEDIUM" -> WorkItemPriority.MEDIUM;
                    case "LOW" -> WorkItemPriority.LOW;
                    default -> WorkItemPriority.HIGH;
                };
            }
        }
        return WorkItemPriority.HIGH;
    }

    private String deriveTitle(final Map<String, Object> snapshot, final WorkItemPriority priority) {
        final Object alertObj = snapshot.get("alert");
        if (alertObj instanceof Map<?, ?> alert) {
            final Object source = alert.get("source");
            final Object severity = alert.get("severity");
            if (source != null && severity != null) {
                return "Failed investigation: " + severity + " alert from " + source;
            }
        }
        return "Failed investigation: " + priority + " priority — review required";
    }

    private String serializePayload(final Map<String, Object> snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            LOG.warnf(e, "Failed to serialize case context for failure-review WorkItem");
            return "{}";
        }
    }
}
