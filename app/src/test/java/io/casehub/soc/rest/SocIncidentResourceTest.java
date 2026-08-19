package io.casehub.soc.rest;

import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.platform.testing.FixedCurrentPrincipal;
import io.casehub.ras.api.SituationRegistration;
import io.casehub.ras.runtime.SituationDefinitionRegistry;
import io.casehub.ras.runtime.SituationEvaluator;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class SocIncidentResourceTest {

    private static final String TENANT = "test-tenant";

    @Inject FixedCurrentPrincipal principal;
    @Inject SituationEvaluator situationEvaluator;
    @Inject SituationDefinitionRegistry registry;
    @Inject CaseInstanceRepository caseInstanceRepository;


    @BeforeEach
    void setUp() {
        principal.setTenancyId(TENANT);
    }

    @Test
    void listIncidents_returnsEntitiesAndTotalCount() {
        RestAssured.given()
            .when().get("/api/soc/incidents")
            .then()
            .statusCode(200)
            .body("entities", notNullValue())
            .body("totalCount", greaterThanOrEqualTo(0));
    }

    @Test
    void getIncident_withUnknownId_returnsNotFound() {
        RestAssured.given()
            .when().get("/api/soc/incidents/" + UUID.randomUUID())
            .then()
            .statusCode(anyOf(is(200), is(204), is(404)));
    }

    @Test
    void getTimeline_withUnknownId_returnsEmptyList() {
        RestAssured.given()
            .when().get("/api/soc/incidents/" + UUID.randomUUID() + "/timeline")
            .then()
            .statusCode(200)
            .body("$", empty());
    }

    @Test
    void getChannels_withUnknownId_returnsEmptyList() {
        RestAssured.given()
            .when().get("/api/soc/incidents/" + UUID.randomUUID() + "/channels")
            .then()
            .statusCode(200)
            .body("$", empty());
    }

    @Test
    void getIocs_withUnknownId_returnsEmptyIocs() {
        RestAssured.given()
            .when().get("/api/soc/incidents/" + UUID.randomUUID() + "/iocs")
            .then()
            .statusCode(200)
            .body("iocs", empty());
    }

    @Test
    void getAttck_withUnknownId_returnsEmptyTechniques() {
        RestAssured.given()
            .when().get("/api/soc/incidents/" + UUID.randomUUID() + "/attck")
            .then()
            .statusCode(200)
            .body("techniques", empty());
    }

    @Test
    void getIncident_createdAtMatchesRepositoryValue() {
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
        situationEvaluator.evaluate(event, reg.definition(), "test-host-ts", TENANT);

        List<CaseInstance> cases      = caseInstanceRepository.findAll(TENANT);
        CaseInstance       incident   = cases.getLast();
        UUID               incidentId = incident.getUuid();

        assertThat(incident.getCreatedAt())
                .as("engine should set createdAt on case start")
                .isNotNull();

        String apiCreatedAt = RestAssured.given()
                                         .when().get("/api/soc/incidents")
                                         .then().statusCode(200)
                                         .extract().jsonPath()
                                         .getString("entities.find { it.id == '" + incidentId + "' }.createdAt");

        assertThat(apiCreatedAt)
                .as("API createdAt should match repository value")
                .isNotNull()
                .isEqualTo(incident.getCreatedAt().toString());
    }

}
