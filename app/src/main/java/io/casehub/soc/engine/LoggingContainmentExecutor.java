package io.casehub.soc.engine;

import io.casehub.soc.engine.spi.ContainmentContext;
import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.quarkus.arc.DefaultBean;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.Map;

@ApplicationScoped
@DefaultBean
public class LoggingContainmentExecutor implements ContainmentExecutor {

    private static final Logger LOG = Logger.getLogger(LoggingContainmentExecutor.class);

    @Override
    public ContainmentResult execute(String actionType, Map<String, Object> parameters,
                                     ContainmentContext context) {
        LOG.infof("CONTAINMENT EXECUTED [%s]: actionType=%s, caseId=%s, approver=%s, params=%s",
                context.tenancyId(), actionType, context.caseId(), context.approver(), parameters);
        return ContainmentResult.success("Logged containment action: " + actionType, Instant.now());
    }
}
