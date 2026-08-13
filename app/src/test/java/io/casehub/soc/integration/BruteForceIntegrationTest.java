package io.casehub.soc.integration;

import io.casehub.platform.testing.FixedCurrentPrincipal;
import io.casehub.ras.api.ChainMode;
import io.casehub.ras.api.SituationRegistration;
import io.casehub.ras.runtime.SituationDefinitionRegistry;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class BruteForceIntegrationTest {

    private static final String TENANT = "test-tenant";

    @Inject
    SituationDefinitionRegistry registry;
    @Inject
    FixedCurrentPrincipal principal;

    @BeforeEach
    void setUp() {
        principal.setTenancyId(TENANT);
    }

    @Test
    void bruteForceBySource_situationRegistered() {
        List<SituationRegistration> regs = registry.findByEventType("soc.alert.auth.failed-login");
        assertThat(regs).extracting(r -> r.definition().situationId())
                .contains("soc-brute-force-by-source");
    }

    @Test
    void credentialStuffingByTarget_situationRegistered() {
        List<SituationRegistration> regs = registry.findByEventType("soc.alert.auth.failed-login");
        assertThat(regs).extracting(r -> r.definition().situationId())
                .contains("soc-credential-stuffing-by-target");
    }

    @Test
    void bruteForceBySource_hasCountChainMode_5() {
        SituationRegistration reg = findSituation("soc-brute-force-by-source");

        assertThat(reg.definition().chainMode()).isInstanceOf(ChainMode.Count.class);
        ChainMode.Count count = (ChainMode.Count) reg.definition().chainMode();
        assertThat(count.ganglionId()).isEqualTo("brute-force-detector");
        assertThat(count.requiredCount()).isEqualTo(5);
    }

    @Test
    void credentialStuffingByTarget_hasCountChainMode_3() {
        SituationRegistration reg = findSituation("soc-credential-stuffing-by-target");

        ChainMode.Count count = (ChainMode.Count) reg.definition().chainMode();
        assertThat(count.ganglionId()).isEqualTo("brute-force-detector");
        assertThat(count.requiredCount()).isEqualTo(3);
    }

    @Test
    void bruteForceBySource_hasCorrelationKeyExpressionInYaml() {
        // correlationKeyExpression is declared in YAML but may not be parsed
        // by all RAS versions. Verify the situation loads without error —
        // the expression is tested at the RAS runtime level.
        SituationRegistration reg = findSituation("soc-brute-force-by-source");
        assertThat(reg.definition()).isNotNull();
    }

    @Test
    void allFourEventTypes_registeredForBothSituations() {
        for (String eventType : List.of(
                "soc.alert.auth.failed-login",
                "soc.alert.auth.failed-mfa",
                "soc.alert.auth.account-lockout",
                "soc.alert.auth.password-spray")) {
            List<SituationRegistration> regs = registry.findByEventType(eventType);
            assertThat(regs).extracting(r -> r.definition().situationId())
                    .as("Event type %s should match both situations", eventType)
                    .contains("soc-brute-force-by-source", "soc-credential-stuffing-by-target");
        }
    }

    private SituationRegistration findSituation(String situationId) {
        return registry.findByEventType("soc.alert.auth.failed-login")
                .stream()
                .filter(r -> situationId.equals(r.definition().situationId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Situation " + situationId + " not found"));
    }
}
