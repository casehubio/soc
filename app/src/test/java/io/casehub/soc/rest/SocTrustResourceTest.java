package io.casehub.soc.rest;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class SocTrustResourceTest {

    @Test
    void getAgentTrust_returnsScoreShape() {
        RestAssured.given()
            .when().get("/api/soc/trust/soc:rule-ioc-enrichment")
            .then()
            .statusCode(200)
            .body("agentId", is("soc:rule-ioc-enrichment"))
            .body("dimensions", notNullValue());
    }

    @Test
    void getFleetKpis_returnsMetrics() {
        RestAssured.given()
            .when().get("/api/soc/trust/fleet-kpis")
            .then()
            .statusCode(200)
            .body("$", hasSize(greaterThanOrEqualTo(1)))
            .body("[0].label", notNullValue());
    }

    @Test
    void getRoutingRationale_withUnknownCase_returnsEmptyList() {
        RestAssured.given()
                   .when().get("/api/soc/trust/routing/" + UUID.randomUUID())
                   .then()
                   .statusCode(200)
                   .body("$", empty());
    }

}
