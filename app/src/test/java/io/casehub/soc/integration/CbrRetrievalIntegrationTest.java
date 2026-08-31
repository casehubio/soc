package io.casehub.soc.integration;

import io.casehub.soc.engine.cbr.SocCbrRetrieveService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;

@QuarkusTest
class CbrRetrievalIntegrationTest {

    @Inject
    SocCbrRetrieveService cbrRetrieveService;

    @Test
    void cbrRetrievalWorker_satisfiesCapability() {
        RestAssured.given()
            .contentType("application/json")
            .body("{\"eventType\":\"soc.alert.siem.crowdstrike\",\"severity\":\"CRITICAL\","
                + "\"source\":\"10.0.1.42\",\"rule\":\"credential-harvesting\"}")
            .when().post("/api/soc/demo/inject-alert")
            .then()
            .statusCode(200)
            .body("evaluated", is(true));
    }

    @Test
    void seedDataIsRetrievable() {
        var results = cbrRetrieveService.retrieve(
            Map.of("alert", Map.of("type", "credential-harvesting",
                "source", "crowdstrike", "severity", "CRITICAL",
                "description", "Credential harvesting")),
            "278776f9-e1b0-46fb-9032-8bddebdcf9ce");

        assertThat(results).as("seed data should be retrievable").isNotEmpty();
    }
}
