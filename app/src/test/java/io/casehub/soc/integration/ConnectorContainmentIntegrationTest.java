package io.casehub.soc.integration;

import io.casehub.soc.engine.HttpContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentContext;
import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@Disabled("Blocked by qhorus SNAPSHOT drift — CDI deployment errors in qhorus runtime services")
class ConnectorContainmentIntegrationTest {

    @Inject
    ContainmentExecutor containmentExecutor;

    @Test
    void httpExecutorDisplacesLogging() {
        assertThat(containmentExecutor).isInstanceOf(HttpContainmentExecutor.class);
    }

    @Test
    void executesViaSimulatedConnector() {
        var context = new ContainmentContext(
                UUID.randomUUID(), "INC-TEST", "test-analyst", "test-tenant");

        ContainmentResult result = containmentExecutor.execute(
                "isolate.host",
                Map.of("hostId", "test-host"),
                context);

        assertThat(result.success()).isTrue();
        assertThat(result.details()).contains("isolate.host");
    }

    @Test
    void unmappedActionFallsThrough() {
        var context = new ContainmentContext(
                UUID.randomUUID(), "INC-TEST", null, "test-tenant");

        ContainmentResult result = containmentExecutor.execute(
                "enable.enhanced.logging",
                Map.of(),
                context);

        assertThat(result.success()).isTrue();
        assertThat(result.details()).contains("no connector");
    }
}
