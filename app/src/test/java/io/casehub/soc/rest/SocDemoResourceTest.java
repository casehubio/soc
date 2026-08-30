package io.casehub.soc.rest;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class SocDemoResourceTest {

    @Test
    void injectAlert_criticalSiem_returnsEvaluated() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"eventType\":\"soc.alert.siem.crowdstrike\",\"severity\":\"CRITICAL\",\"source\":\"10.0.1.42\",\"rule\":\"credential-harvesting\"}")
            .when().post("/api/soc/demo/inject-alert")
            .then()
            .statusCode(200)
            .body("evaluated", is(true))
            .body("situationId", is("soc-siem-alert-critical"))
            .body("eventId", notNullValue())
            .body("correlationKey", notNullValue());
    }

    @Test
    void injectAlert_unknownEventType_returns400() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"eventType\":\"soc.alert.unknown.type\",\"severity\":\"HIGH\"}")
            .when().post("/api/soc/demo/inject-alert")
            .then()
            .statusCode(400)
            .body("error", notNullValue());
    }

    @Test
    void injectAlert_missingEventType_returns400() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"severity\":\"HIGH\"}")
            .when().post("/api/soc/demo/inject-alert")
            .then()
            .statusCode(400);
    }

    @Test
    void injectAlert_bruteForceEvent_returnsEvaluated() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"eventType\":\"soc.alert.auth.failed-login\",\"severity\":\"MEDIUM\",\"source\":\"192.168.1.100\",\"correlationKey\":\"192.168.1.100\"}")
            .when().post("/api/soc/demo/inject-alert")
            .then()
            .statusCode(200)
            .body("evaluated", is(true))
            .body("correlationKey", is("192.168.1.100"));
    }
}
