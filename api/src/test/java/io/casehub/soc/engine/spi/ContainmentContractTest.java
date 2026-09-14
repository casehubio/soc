package io.casehub.soc.engine.spi;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ContainmentContractTest {

    @Test
    void requestFromContextFactory() {
        var context = new ContainmentContext(
                UUID.randomUUID(), "INC-002", "analyst@corp.com", "tenant-2");
        var request = ContainmentRequest.from(
                "block.ip", Map.of("ip", "10.0.1.99"), context);

        assertEquals("block.ip", request.actionType());
        assertEquals(context.caseId().toString(), request.caseId());
        assertEquals("INC-002", request.incidentId());
        assertEquals("analyst@corp.com", request.approver());
        assertEquals("tenant-2", request.tenancyId());
        assertEquals(ContainmentContext.DEFAULT_TIMEOUT_MS, request.timeoutMs());
        assertEquals("10.0.1.99", request.parameters().get("ip"));
    }

    @Test
    void requestPreservesAllFields() {
        var request = new ContainmentRequest(
                "isolate.host",
                Map.of("hostId", "srv-42"),
                "case-1", "INC-001", "jane@corp.com", "tenant-1", 30_000L);

        assertEquals("isolate.host", request.actionType());
        assertEquals("case-1", request.caseId());
        assertEquals("jane@corp.com", request.approver());
        assertEquals(30_000L, request.timeoutMs());
    }

    @Test
    void responseToResultSuccess() {
        var response = new ContainmentResponse(true, "Done", null, false, Map.of());
        ContainmentResult result = response.toResult();

        assertTrue(result.success());
        assertEquals("Done", result.details());
        assertNotNull(result.timestamp());
        assertNull(result.errorReason());
    }

    @Test
    void responseToResultFailure() {
        var response = new ContainmentResponse(false, null, "timeout", true, Map.of());
        ContainmentResult result = response.toResult();

        assertFalse(result.success());
        assertEquals("timeout", result.errorReason());
        assertTrue(result.retryable());
    }

    @Test
    void responseMetadataPreserved() {
        var metadata = Map.<String, Object>of("session_id", "cs-123", "latency_ms", 42);
        var response = new ContainmentResponse(true, "ok", null, false, metadata);

        assertEquals("cs-123", response.metadata().get("session_id"));
        assertEquals(42, response.metadata().get("latency_ms"));
    }
}
