package io.casehub.soc.integration;

import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.platform.testing.FixedCurrentPrincipal;
import io.casehub.ras.api.SituationRegistration;
import io.casehub.ras.runtime.SituationDefinitionRegistry;
import io.casehub.ras.runtime.SituationEvaluator;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class AlertToCaseIntegrationTest {

    private static final String TENANT = "test-tenant";

    @Inject
    SituationEvaluator          situationEvaluator;
    @Inject
    SituationDefinitionRegistry registry;
    @Inject
    CaseInstanceRepository      caseInstanceRepository;
    @Inject
    FixedCurrentPrincipal       principal;

    @BeforeEach
    void setUp() {
        principal.setTenancyId(TENANT);
    }

    @Test
    void criticalSiemAlert_shouldCreateIncidentCase() {
        CloudEvent event = CloudEventBuilder.v1()
                                            .withId(UUID.randomUUID().toString())
                                            .withSource(URI.create("test://siem"))
                                            .withType("soc.alert.siem.crowdstrike")
                                            .withExtension("alertseverity", "CRITICAL")
                                            .withExtension("alertsource", "crowdstrike")
                                            .withExtension("alertrule", "credential-harvesting")
                                            .withExtension("tenancyid", TENANT)
                                            .build();

        List<SituationRegistration> registrations = registry.findByEventType(event.getType());
        assertThat(registrations).isNotEmpty();

        SituationRegistration reg = registrations.getFirst();
        assertThat(reg.definition().situationId()).isEqualTo("soc-siem-alert-critical");

        int beforeCount = caseInstanceRepository.findAll(TENANT).size();
        situationEvaluator.evaluate(event, reg.definition(), "test-host-1", TENANT);

        List<CaseInstance> cases = caseInstanceRepository.findAll(TENANT);
        assertThat(cases).as("New CaseInstance created").hasSize(beforeCount + 1);

        CaseInstance incident = cases.getLast();
        assertThat(incident.getState()).isNotNull();
        assertThat(incident.tenancyId).isEqualTo(TENANT);

        var context = incident.getCaseContext();
        assertThat(context).isNotNull();
        assertThat(context.get("alert")).as("case context should contain alert data").isNotNull();
        assertThat(context.get("priority")).as("case context should contain baseCaseData priority").isEqualTo("HIGH");
    }

    @Test
    void caseContext_shouldSeedBindingGuardData() {
        CloudEvent event = CloudEventBuilder.v1()
                                            .withId(UUID.randomUUID().toString())
                                            .withSource(URI.create("test://siem"))
                                            .withType("soc.alert.siem.crowdstrike")
                                            .withExtension("alertseverity", "CRITICAL")
                                            .withExtension("alertsource", "crowdstrike")
                                            .withExtension("alertrule", "credential-harvesting")
                                            .withExtension("tenancyid", TENANT)
                                            .build();

        SituationRegistration reg = registry.findByEventType(event.getType()).getFirst();
        situationEvaluator.evaluate(event, reg.definition(), "test-host-2", TENANT);

        List<CaseInstance> cases = caseInstanceRepository.findAll(TENANT);
        assertThat(cases).isNotEmpty();

        var context = cases.getFirst().getCaseContext();

        assertThat(context.get("alert")).as("alert present — ioc-enrichment guard fires").isNotNull();
        assertThat(context.get("iocEnrichment")).as("no worker ran — guard stays true").isNull();
        assertThat(context.get("attckMapping")).as("no worker ran — attck guard stays false").isNull();
        assertThat(context.get("containmentRecommendation")).as("no worker ran").isNull();
        assertThat(context.get("analystDecision")).as("no human task completed").isNull();

        assertThat(context.get("priority")).isEqualTo("HIGH");
        assertThat(context.get("source")).isEqualTo("siem-alert");
        assertThat(context.get("situationId")).isEqualTo("soc-siem-alert-critical");
        assertThat(context.get("correlationKey")).isEqualTo("test-host-2");
    }


}



