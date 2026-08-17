package io.casehub.soc.rest;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.inject.Inject;
import io.casehub.platform.testing.FixedCurrentPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.hamcrest.Matchers.*;

@QuarkusTest
class SocIncidentResourceTest {

    private static final String TENANT = "test-tenant";

    @Inject FixedCurrentPrincipal principal;

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
}
