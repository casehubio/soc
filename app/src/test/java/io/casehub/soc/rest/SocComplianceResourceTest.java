package io.casehub.soc.rest;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class SocComplianceResourceTest {

    @Test
    void getEntries_returnsPagedResponse() {
        RestAssured.given()
            .queryParam("from", "2020-01-01T00:00:00Z")
            .queryParam("to", "2030-01-01T00:00:00Z")
            .when().get("/api/soc/compliance/entries")
            .then()
            .statusCode(200)
            .body("page", is(0))
            .body("size", is(50))
            .body("totalElements", notNullValue())
            .body("content", notNullValue());
    }

    @Test
    void getDistinctActors_returnsList() {
        RestAssured.given()
            .queryParam("from", "2020-01-01T00:00:00Z")
            .queryParam("to", "2030-01-01T00:00:00Z")
            .when().get("/api/soc/compliance/entries/actors")
            .then()
            .statusCode(200);
    }

    @Test
    void getSummary_returnsRequirements() {
        RestAssured.given()
            .when().get("/api/soc/compliance/summary")
            .then()
            .statusCode(200);
    }

    @Test
    void postErasure_withUnknownActor_returnsAlreadyWithdrawn() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"subjectId\":\"unknown-actor-xyz\",\"reason\":\"GDPR Art.17 Request\"}")
            .when().post("/api/soc/compliance/erasure")
            .then()
            .statusCode(200)
            .body("status", is("ALREADY_WITHDRAWN"))
            .body("entryCount", is(0));
    }

    @Test
    void postErasure_withUnknownReason_returns400() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"subjectId\":\"unknown-actor\",\"reason\":\"INVALID_REASON\"}")
            .when().post("/api/soc/compliance/erasure")
            .then()
            .statusCode(400);
    }
}
