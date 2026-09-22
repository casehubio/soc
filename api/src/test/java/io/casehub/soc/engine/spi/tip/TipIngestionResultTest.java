package io.casehub.soc.engine.spi.tip;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TipIngestionResultTest {

    @Test
    void successResult() {
        var result = TipIngestionResult.success("crowdstrike-intel", 42, 3);

        assertEquals("crowdstrike-intel", result.feedId());
        assertEquals(42, result.chunksIngested());
        assertEquals(3, result.mindMapNodesLinked());
        assertTrue(result.errors().isEmpty());
        assertTrue(result.succeeded());
    }

    @Test
    void failureResult() {
        var result = TipIngestionResult.failure("rf-indicators",
            List.of("Connection timeout", "Invalid API key"));

        assertEquals("rf-indicators", result.feedId());
        assertEquals(0, result.chunksIngested());
        assertEquals(0, result.mindMapNodesLinked());
        assertEquals(List.of("Connection timeout", "Invalid API key"), result.errors());
        assertFalse(result.succeeded());
    }
}
