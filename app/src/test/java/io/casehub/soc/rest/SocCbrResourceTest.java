package io.casehub.soc.rest;

import io.casehub.platform.testing.FixedCurrentPrincipal;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.hamcrest.Matchers.*;

@QuarkusTest
class SocCbrResourceTest {

    @Inject FixedCurrentPrincipal principal;

    @BeforeEach
    void setUp() {
        principal.setTenancyId("test-tenant");
    }

    @Test
    void getSimilar_withUnknownCase_returnsSummaryAndEmptyIncidents() {
        RestAssured.given()
            .when().get("/api/soc/cbr/similar/" + UUID.randomUUID())
            .then()
            .statusCode(200)
            .body("summary.totalSimilar", is(0))
            .body("incidents", empty());
    }
}
