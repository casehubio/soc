package io.casehub.soc.worker.contract;

import io.casehub.soc.domain.AttackTactic;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CapabilityOutputContractTest {

    @Test
    void iocEnrichmentOutput_roundTripsToMap() {
        var output = new IocEnrichmentOutput(
                List.of(new IocEnrichmentOutput.IocEntry("IP_ADDRESS", "10.0.0.1", "alert-rawData")),
                "1 IOC extracted");
        assertThat(output.iocs()).hasSize(1);
        assertThat(output.iocs().getFirst().type()).isEqualTo("IP_ADDRESS");
        assertThat(output.summary()).isEqualTo("1 IOC extracted");
    }

    @Test
    void attckMappingOutput_capturesTacticAndTechniques() {
        var output = new AttckMappingOutput(
                List.of(new AttckMappingOutput.TechniqueEntry("T1566", 0.85, "phishing email")),
                AttackTactic.INITIAL_ACCESS.name(),
                0.85,
                "Phishing campaign detected");
        assertThat(output.techniques()).hasSize(1);
        assertThat(output.primaryTactic()).isEqualTo("INITIAL_ACCESS");
        assertThat(output.confidence()).isEqualTo(0.85);
    }

    @Test
    void containmentRecommendationOutput_capturesActionAndRisk() {
        var output = new ContainmentRecommendationOutput(
                "REVOKE_CREDENTIALS", 0.60, 0.90,
                "Credential harvesting detected",
                Map.of("targetUser", "admin"));
        assertThat(output.recommendedAction()).isEqualTo("REVOKE_CREDENTIALS");
        assertThat(output.riskScore()).isEqualTo(0.60);
        assertThat(output.actionParameters()).containsKey("targetUser");
    }

    @Test
    void iocEnrichmentOutput_emptyIocsIsValid() {
        var output = new IocEnrichmentOutput(List.of(), "No IOCs identified");
        assertThat(output.iocs()).isEmpty();
        assertThat(output.summary()).isEqualTo("No IOCs identified");
    }
}
