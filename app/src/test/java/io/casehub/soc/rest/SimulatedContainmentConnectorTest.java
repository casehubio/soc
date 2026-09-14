package io.casehub.soc.rest;

import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SimulatedContainmentConnectorTest {

    @Test
    void returnsSuccessForKnownActionType() {
        var connector = new SimulatedContainmentConnector();

        var request = new ContainmentRequest(
                "isolate.host", Map.of("hostId", "srv-42"),
                "case-1", "INC-001", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.execute(request);

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("isolate.host");
        assertThat(response.metadata()).isNotNull();
        assertThat(response.metadata()).containsKey("sim_id");
    }

    @Test
    void returnsSuccessForUnknownActionType() {
        var connector = new SimulatedContainmentConnector();

        var request = new ContainmentRequest(
                "custom.action", Map.of(),
                "case-1", "INC-001", null, "tenant-1", 30_000L);

        ContainmentResponse response = connector.execute(request);

        assertThat(response.success()).isTrue();
        assertThat(response.details()).contains("custom.action");
    }

    @Test
    void metadataContainsActionTypeAndSimId() {
        var connector = new SimulatedContainmentConnector();

        var request = new ContainmentRequest(
                "block.ip", Map.of("ip", "10.0.1.99"),
                "case-2", "INC-002", "analyst@corp.com", "tenant-1", 30_000L);

        ContainmentResponse response = connector.execute(request);

        assertThat(response.metadata()).containsEntry("sim_action_type", "block.ip");
        assertThat(response.metadata().get("sim_id").toString()).startsWith("sim-");
    }
}
