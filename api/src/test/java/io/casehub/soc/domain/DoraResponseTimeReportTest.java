package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DoraResponseTimeReportTest {

    @Test
    void emptyReport_zeroIncidents() {
        var report = new DoraResponseTimeReport(
                Instant.parse("2026-08-01T00:00:00Z"),
                Instant.parse("2026-08-31T23:59:59Z"),
                0, Map.of());
        assertEquals(0, report.totalIncidents());
        assertTrue(report.byPriority().isEmpty());
    }

    @Test
    void priorityStats_holdsAllFields() {
        var stats = new PriorityStats(10, Duration.ofMinutes(5),
                Duration.ofMinutes(30), Duration.ofHours(2), 0.9);
        assertEquals(10, stats.count());
        assertEquals(Duration.ofMinutes(5), stats.avgTimeToTriage());
        assertEquals(Duration.ofMinutes(30), stats.avgTimeToContainment());
        assertEquals(Duration.ofHours(2), stats.avgTimeToResolution());
        assertEquals(0.9, stats.slaCompliancePercent());
    }
}
