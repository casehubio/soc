package io.casehub.soc.rest;

import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.ras.api.SituationRegistration;
import io.casehub.ras.runtime.SituationDefinitionRegistry;
import io.casehub.ras.runtime.SituationEvaluator;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/soc/demo")
@ApplicationScoped
@RolesAllowed("soc-demo-admin")
public class SocDemoResource {

    @Inject SituationEvaluator evaluator;
    @Inject SituationDefinitionRegistry registry;
    @Inject CurrentPrincipal currentPrincipal;

    @POST
    @Path("/inject-alert")
    public Map<String, Object> injectAlert(Map<String, String> body) {
        String eventType = body.get("eventType");
        if (eventType == null || eventType.isBlank()) {
            throw new BadRequestException("eventType is required");
        }

        String severity = body.getOrDefault("severity", "HIGH");
        String source = body.getOrDefault("source", "demo-source");
        String rule = body.getOrDefault("rule", "demo-rule");
        String correlationKey = body.getOrDefault("correlationKey",
            UUID.randomUUID().toString());

        List<SituationRegistration> registrations =
            registry.findByEventType(eventType);
        if (registrations.isEmpty()) {
            throw new BadRequestException(
                "No situation registered for event type: " + eventType);
        }

        String eventId = UUID.randomUUID().toString();
        CloudEvent event = CloudEventBuilder.v1()
            .withId(eventId)
            .withSource(URI.create("soc://demo"))
            .withType(eventType)
            .withExtension("alertseverity", severity)
            .withExtension("alertsource", source)
            .withExtension("alertrule", rule)
            .withExtension("tenancyid", currentPrincipal.tenancyId())
            .build();

        SituationRegistration reg = registrations.getFirst();
        evaluator.evaluate(event, reg.definition(),
            correlationKey, currentPrincipal.tenancyId());

        return Map.of(
            "situationId", reg.definition().situationId(),
            "eventId", eventId,
            "correlationKey", correlationKey,
            "evaluated", true
        );
    }
}
