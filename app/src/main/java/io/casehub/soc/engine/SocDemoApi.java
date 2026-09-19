package io.casehub.soc.engine;

import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PlatformMutation;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.ras.api.SituationRegistration;
import io.casehub.ras.runtime.SituationDefinitionRegistry;
import io.casehub.ras.runtime.SituationEvaluator;
import io.casehub.soc.rest.dto.AlertInjectionRequest;
import io.casehub.soc.rest.dto.AlertInjectionResponse;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@McpDomain(value = "soc/demo", basePath = "/api/soc/demo")
@ApplicationScoped
@RolesAllowed("soc-demo-admin")
public class SocDemoApi {

    @Inject SituationEvaluator evaluator;
    @Inject SituationDefinitionRegistry registry;
    @Inject CurrentPrincipal currentPrincipal;

    @PlatformMutation("Inject a simulated alert for testing")
    @RestPath("/inject-alert")
    public AlertInjectionResponse injectAlert(AlertInjectionRequest request) {
        if (request.eventType() == null || request.eventType().isBlank()) {
            throw new BadRequestException("eventType is required");
        }

        String severity = request.severity() != null ? request.severity() : "HIGH";
        String source = request.source() != null ? request.source() : "demo-source";
        String rule = request.rule() != null ? request.rule() : "demo-rule";
        String correlationKey = request.correlationKey() != null
            ? request.correlationKey() : UUID.randomUUID().toString();

        List<SituationRegistration> registrations =
            registry.findByEventType(request.eventType());
        if (registrations.isEmpty()) {
            throw new BadRequestException(
                "No situation registered for event type: " + request.eventType());
        }

        String eventId = UUID.randomUUID().toString();
        CloudEvent event = CloudEventBuilder.v1()
            .withId(eventId)
            .withSource(URI.create("soc://demo"))
            .withType(request.eventType())
            .withExtension("alertseverity", severity)
            .withExtension("alertsource", source)
            .withExtension("alertrule", rule)
            .withExtension("tenancyid", currentPrincipal.tenancyId())
            .build();

        SituationRegistration reg = registrations.getFirst();
        evaluator.evaluate(event, reg.definition(),
            correlationKey, currentPrincipal.tenancyId());

        return new AlertInjectionResponse(
            reg.definition().situationId(), eventId,
            correlationKey, true);
    }
}
