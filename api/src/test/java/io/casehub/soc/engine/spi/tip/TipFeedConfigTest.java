package io.casehub.soc.engine.spi.tip;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TipFeedConfigTest {

    @Test
    void buildsConfigWithRequiredFields() {
        var config = TipFeedConfig.builder()
            .feedId("crowdstrike-intel")
            .providerName("CrowdStrike")
            .corpusName("crowdstrike-threat-intel")
            .pollInterval(Duration.ofHours(6))
            .build();

        assertEquals("crowdstrike-intel", config.feedId());
        assertEquals("CrowdStrike", config.providerName());
        assertEquals("crowdstrike-threat-intel", config.corpusName());
        assertEquals(Duration.ofHours(6), config.pollInterval());
    }

    @Test
    void buildsConfigWithOptionalFields() {
        var config = TipFeedConfig.builder()
            .feedId("rf-indicators")
            .providerName("Recorded Future")
            .corpusName("rf-indicators")
            .pollInterval(Duration.ofHours(1))
            .credentials(Map.of("apiKey", "redacted"))
            .endpointUrl("https://api.recordedfuture.com/v2/indicators")
            .linkToMindMap(true)
            .build();

        assertEquals("redacted", config.credentials().get("apiKey"));
        assertEquals("https://api.recordedfuture.com/v2/indicators", config.endpointUrl());
        assertTrue(config.linkToMindMap());
    }

    @Test
    void defaultsForOptionalFields() {
        var config = TipFeedConfig.builder()
            .feedId("test")
            .providerName("Test")
            .corpusName("test-corpus")
            .pollInterval(Duration.ofHours(12))
            .build();

        assertTrue(config.credentials().isEmpty());
        assertNull(config.endpointUrl());
        assertFalse(config.linkToMindMap());
    }

    @Test
    void rejectsMissingFeedId() {
        assertThrows(NullPointerException.class, () -> TipFeedConfig.builder()
            .providerName("Test")
            .corpusName("test")
            .pollInterval(Duration.ofHours(1))
            .build());
    }
}
