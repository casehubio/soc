package io.casehub.soc.detection;

import io.casehub.ras.api.DetectionSignal;
import io.casehub.ras.api.SituationContext;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class BruteForceDetectorGanglionTest {

    private final BruteForceDetectorGanglion ganglion = new BruteForceDetectorGanglion();

    @Test
    void ganglionId() {
        assertEquals("brute-force-detector", ganglion.ganglionId());
    }

    @Test
    void handledEventTypes_containsAllFourAuthTypes() {
        var types = ganglion.handledEventTypes();
        assertEquals(4, types.size());
        assertTrue(types.contains("soc.alert.auth.failed-login"));
        assertTrue(types.contains("soc.alert.auth.failed-mfa"));
        assertTrue(types.contains("soc.alert.auth.account-lockout"));
        assertTrue(types.contains("soc.alert.auth.password-spray"));
    }

    @Test
    void failedLogin_returnsDetectedWithDefaultConfidence() {
        var result = ganglion.detect(authEvent("soc.alert.auth.failed-login"), emptyContext());
        assertEquals(DetectionSignal.DETECTED, result.signal());
        assertEquals(0.9, result.confidence());
        assertEquals("brute-force-detector", result.ganglionId());
    }

    @Test
    void failedMfa_returnsDetected() {
        var result = ganglion.detect(authEvent("soc.alert.auth.failed-mfa"), emptyContext());
        assertEquals(DetectionSignal.DETECTED, result.signal());
    }

    @Test
    void accountLockout_returnsDetected() {
        var result = ganglion.detect(authEvent("soc.alert.auth.account-lockout"), emptyContext());
        assertEquals(DetectionSignal.DETECTED, result.signal());
    }

    @Test
    void passwordSpray_returnsDetected() {
        var result = ganglion.detect(authEvent("soc.alert.auth.password-spray"), emptyContext());
        assertEquals(DetectionSignal.DETECTED, result.signal());
    }

    @Test
    void evidenceContainsEventType() {
        var result = ganglion.detect(
                authEventWithExtensions("soc.alert.auth.failed-login", "10.0.0.1", "user@corp.com"),
                emptyContext());
        assertEquals("soc.alert.auth.failed-login", result.evidence().get("eventType"));
    }

    @Test
    void evidenceContainsSourceIpWhenPresent() {
        var result = ganglion.detect(
                authEventWithExtensions("soc.alert.auth.failed-login", "192.168.1.100", "user@corp.com"),
                emptyContext());
        assertEquals("192.168.1.100", result.evidence().get("sourceIp"));
    }

    @Test
    void evidenceContainsTargetAccountWhenPresent() {
        var result = ganglion.detect(
                authEventWithExtensions("soc.alert.auth.failed-login", "10.0.0.1", "admin@corp.com"),
                emptyContext());
        assertEquals("admin@corp.com", result.evidence().get("targetAccount"));
    }

    @Test
    void evidenceOmitsMissingExtensions() {
        var result = ganglion.detect(authEvent("soc.alert.auth.failed-login"), emptyContext());
        assertTrue(result.evidence().containsKey("eventType"));
        assertFalse(result.evidence().containsKey("sourceIp"));
        assertFalse(result.evidence().containsKey("targetAccount"));
    }

    @Test
    void customScorer_overridesDefaultConfidence() {
        BruteForceScorer custom = event -> 0.75;
        var customGanglion = new BruteForceDetectorGanglion(custom);
        var result = customGanglion.detect(authEvent("soc.alert.auth.failed-login"), emptyContext());
        assertEquals(0.75, result.confidence());
    }

    @Test
    void defaultScorer_returns09() {
        assertEquals(0.9, BruteForceScorer.DEFAULT.score(authEvent("soc.alert.auth.failed-login")));
    }

    private static CloudEvent authEvent(String type) {
        return CloudEventBuilder.v1()
                .withId(UUID.randomUUID().toString())
                .withSource(URI.create("test://auth"))
                .withType(type)
                .build();
    }

    private static CloudEvent authEventWithExtensions(String type, String sourceIp, String targetAccount) {
        var builder = CloudEventBuilder.v1()
                .withId(UUID.randomUUID().toString())
                .withSource(URI.create("test://auth"))
                .withType(type);
        if (sourceIp != null) builder.withExtension("sourceip", sourceIp);
        if (targetAccount != null) builder.withExtension("targetaccount", targetAccount);
        return builder.build();
    }

    private static SituationContext emptyContext() {
        return SituationContext.initial("test-situation", "test-key", "test-tenant", Instant.now());
    }
}
