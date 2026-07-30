package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.ContainmentRecommendationOutput;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class ContainmentDecisionMatrixTest {

    @ParameterizedTest
    @CsvSource({
            "CRITICAL, CREDENTIAL_ACCESS,  REVOKE_CREDENTIALS,  0.60",
            "CRITICAL, LATERAL_MOVEMENT,   ISOLATE_HOST,         0.85",
            "CRITICAL, EXFILTRATION,       NETWORK_SEGMENTATION, 0.95",
            "HIGH,     INITIAL_ACCESS,     BLOCK_IP,             0.40",
            "HIGH,     EXECUTION,          ISOLATE_HOST,         0.75",
            "MEDIUM,   INITIAL_ACCESS,     BLOCK_IP,             0.30"
    })
    void severityAndTactic_mapsToAction(String severity, String tactic,
                                        String expectedAction, double expectedRisk) {
        ContainmentRecommendationOutput result =
                ContainmentDecisionMatrix.decide(severity, tactic);
        assertThat(result.recommendedAction()).isEqualTo(expectedAction);
        assertThat(result.riskScore()).isEqualTo(expectedRisk);
    }

    @Test
    void lowSeverity_recommendsNoAction() {
        ContainmentRecommendationOutput result =
                ContainmentDecisionMatrix.decide("LOW", "INITIAL_ACCESS");
        assertThat(result.recommendedAction()).isNull();
        assertThat(result.riskScore()).isEqualTo(0.10);
    }

    @Test
    void unknownSeverity_defaultsToBlockIp() {
        ContainmentRecommendationOutput result =
                ContainmentDecisionMatrix.decide("UNKNOWN", "LATERAL_MOVEMENT");
        assertThat(result.recommendedAction()).isEqualTo("BLOCK_IP");
    }

    @Test
    void rationaleIsPopulated() {
        ContainmentRecommendationOutput result =
                ContainmentDecisionMatrix.decide("CRITICAL", "CREDENTIAL_ACCESS");
        assertThat(result.rationale()).isNotBlank();
    }
}
