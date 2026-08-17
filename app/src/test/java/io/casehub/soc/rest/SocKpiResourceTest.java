package io.casehub.soc.rest;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.inject.Inject;
import io.casehub.platform.testing.FixedCurrentPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

@QuarkusTest
class SocKpiResourceTest {

    private static final String TENANT = "test-tenant";

    @Inject FixedCurrentPrincipal principal;

    @BeforeEach
    void setUp() {
        principal.setTenancyId(TENANT);
    }

    @Test
    void getKpis_returnsMetricArray() {
        RestAssured.given()
            .when().get("/api/soc/kpis")
            .then()
            .statusCode(200)
            .body("$", hasSize(greaterThanOrEqualTo(1)))
            .body("[0].label", notNullValue())
            .body("[0].value", notNullValue());
    }

    @Test
    void getHeatmap_returnsStructure() {
        RestAssured.given()
            .when().get("/api/soc/alerts/heatmap")
            .then()
            .statusCode(200)
            .body("cells", notNullValue())
            .body("sources", notNullValue())
            .body("severities", hasSize(5));
    }
}
