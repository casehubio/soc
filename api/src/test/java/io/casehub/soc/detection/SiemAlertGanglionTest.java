package io.casehub.soc.detection;

import io.casehub.ras.api.DetectionResult;
import io.casehub.ras.api.DetectionSignal;
import io.casehub.ras.api.SituationContext;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class SiemAlertGanglionTest {

    private final SiemAlertGanglion ganglion = new SiemAlertGanglion();

    private static final Instant NOW = Instant.parse("2026-06-30T00:00:00Z");

    private static SituationContext context() {
        return SituationContext.initial("soc-siem-alert-critical", "host-1", "tenant-a", NOW);
    }

    private static CloudEvent alertEvent(String eventType, String severity, String source, String rule) {
        var builder = CloudEventBuilder.v1()
            .withId("evt-1")
            .withSource(URI.create("/siem"))
            .withType(eventType)
            .withTime(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
        if (severity != null) builder.withExtension(SiemAlertGanglion.EXT_SEVERITY, severity);
        if (source != null) builder.withExtension(SiemAlertGanglion.EXT_SOURCE, source);
        if (rule != null) builder.withExtension(SiemAlertGanglion.EXT_RULE, rule);
        return builder.build();
    }

    private static CloudEvent alertEvent(String severity) {
        return alertEvent("soc.alert.siem.crowdstrike", severity, null, null);
    }

    // ── Identity ────────────────────────────────────────────────────────────

    @Test
    void ganglionIdIsCorrect() {
        assertEquals("siem-alert-classifier", ganglion.ganglionId());
    }

    @Test
    void handledEventTypesIncludesSiemAndEdr() {
        var types = ganglion.handledEventTypes();
        assertTrue(types.contains("soc.alert.siem.crowdstrike"), "Missing SIEM CrowdStrike");
        assertTrue(types.contains("soc.alert.siem.splunk"), "Missing SIEM Splunk");
        assertTrue(types.contains("soc.alert.edr.sentinelone"), "Missing EDR SentinelOne");
        assertEquals(6, types.size());
    }

    // ── Severity → Signal mapping ───────────────────────────────────────────

    @Test
    void critical_producesDetectedWithHighConfidence() {
        DetectionResult result = evaluate("CRITICAL");
        assertEquals(DetectionSignal.DETECTED, result.signal());
        assertEquals(0.95, result.confidence());
    }

    @Test
    void high_producesDetected() {
        DetectionResult result = evaluate("HIGH");
        assertEquals(DetectionSignal.DETECTED, result.signal());
        assertEquals(0.80, result.confidence());
    }

    @Test
    void medium_producesWeak() {
        DetectionResult result = evaluate("MEDIUM");
        assertEquals(DetectionSignal.WEAK, result.signal());
        assertEquals(0.50, result.confidence());
    }

    @Test
    void low_producesWeak() {
        DetectionResult result = evaluate("LOW");
        assertEquals(DetectionSignal.WEAK, result.signal());
        assertEquals(0.20, result.confidence());
    }

    @Test
    void informational_producesNoise() {
        DetectionResult result = evaluate("INFORMATIONAL");
        assertEquals(DetectionSignal.NOISE, result.signal());
        assertEquals(0.0, result.confidence());
    }

    // ── Case insensitivity ──────────────────────────────────────────────────

    @Test
    void severity_isCaseInsensitive() {
        assertEquals(DetectionSignal.DETECTED, evaluate("critical").signal());
        assertEquals(DetectionSignal.DETECTED, evaluate("Critical").signal());
        assertEquals(DetectionSignal.WEAK, evaluate("medium").signal());
    }

    // ── Missing / unknown severity ──────────────────────────────────────────

    @Test
    void missingSeverity_producesNoise() {
        CloudEvent event = alertEvent(null);
        DetectionResult result = ganglion.detect(event, context());
        assertEquals(DetectionSignal.NOISE, result.signal());
    }

    @Test
    void unknownSeverity_producesNoise() {
        DetectionResult result = evaluate("BOGUS");
        assertEquals(DetectionSignal.NOISE, result.signal());
    }

    // ── Evidence extraction ─────────────────────────────────────────────────

    @Test
    void evidence_containsEventType() {
        DetectionResult result = evaluate("HIGH");
        assertEquals("soc.alert.siem.crowdstrike", result.evidence().get("eventType"));
    }

    @Test
    void evidence_includesSourceAndRule() {
        CloudEvent event = alertEvent("soc.alert.edr.sentinelone", "CRITICAL", "SentinelOne", "Ransomware Detection");
        DetectionResult result = ganglion.detect(event, context());
        assertEquals("SentinelOne", result.evidence().get("alertSource"));
        assertEquals("Ransomware Detection", result.evidence().get("alertRule"));
    }

    @Test
    void evidence_omitsMissingSourceAndRule() {
        DetectionResult result = evaluate("HIGH");
        assertFalse(result.evidence().containsKey("alertSource"));
        assertFalse(result.evidence().containsKey("alertRule"));
    }

    // ── ganglionId stamp ────────────────────────────────────────────────────

    @Test
    void result_stampsGanglionId() {
        DetectionResult result = evaluate("CRITICAL");
        assertEquals(SiemAlertGanglion.GANGLION_ID, result.ganglionId());
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    private DetectionResult evaluate(String severity) {
        CloudEvent event = alertEvent(severity);
        return ganglion.detect(event, context());
    }
}
