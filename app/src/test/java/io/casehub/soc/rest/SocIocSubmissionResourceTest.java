package io.casehub.soc.rest;

import io.casehub.soc.rest.dto.IocSubmissionRequest;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import io.casehub.platform.testing.FixedCurrentPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.hamcrest.Matchers.*;

@QuarkusTest
class SocIocSubmissionResourceTest {

    private static final String TENANT = "test-tenant";

    @Inject FixedCurrentPrincipal principal;

    @BeforeEach
    void setUp() {
        principal.setTenancyId(TENANT);
    }

    @Test
    void submitIoc_missingType_returns400() {
        RestAssured.given()
            .contentType(ContentType.JSON)
            .body(new IocSubmissionRequest(null, "192.168.1.100", 0.85))
            .when().post("/api/soc/incidents/" + UUID.randomUUID() + "/iocs")
            .then()
            .statusCode(400);
    }

    @Test
    void submitIoc_invalidType_returns400() {
        RestAssured.given()
            .contentType(ContentType.JSON)
            .body(new IocSubmissionRequest("INVALID", "x", 0.5))
            .when().post("/api/soc/incidents/" + UUID.randomUUID() + "/iocs")
            .then()
            .statusCode(400);
    }

    @Test
    void submitIoc_confidenceOutOfRange_returns400() {
        RestAssured.given()
            .contentType(ContentType.JSON)
            .body(new IocSubmissionRequest("IP", "x", 1.5))
            .when().post("/api/soc/incidents/" + UUID.randomUUID() + "/iocs")
            .then()
            .statusCode(400);
    }
}
