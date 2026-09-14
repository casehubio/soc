package io.casehub.soc.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.casehub.soc.engine.spi.ContainmentContext;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class HttpContainmentExecutorTest {

    private static Vertx vertx;
    private static HttpServer server;
    private static int port;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final AtomicReference<String> nextResponse = new AtomicReference<>();
    private static final AtomicReference<Integer> nextStatus = new AtomicReference<>(200);

    @BeforeAll
    static void startServer() throws Exception {
        vertx = Vertx.vertx();
        var latch = new CountDownLatch(1);
        server = vertx.createHttpServer()
                .requestHandler(req -> req.bodyHandler(body ->
                        req.response()
                                .setStatusCode(nextStatus.get())
                                .putHeader("Content-Type", "application/json")
                                .end(nextResponse.get())))
                .listen(0, result -> {
                    port = result.result().actualPort();
                    latch.countDown();
                });
        latch.await(5, TimeUnit.SECONDS);
    }

    @AfterAll
    static void stopServer() {
        if (server != null) server.close();
        if (vertx != null) vertx.close();
    }

    private HttpContainmentExecutor buildExecutor(Map<String, String> routing) {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of(
                "casehub.soc.containment.endpoints.test.url", "http://localhost:" + port + "/containment",
                "casehub.soc.containment.endpoints.test.timeout-seconds", "5"
        ));
        return new HttpContainmentExecutor(resolver, MAPPER, routing);
    }

    private ContainmentContext ctx() {
        return new ContainmentContext(UUID.randomUUID(), "INC-001", "analyst@corp.com", "tenant-1");
    }

    @Test
    void successfulExecution() {
        nextStatus.set(200);
        nextResponse.set("{\"success\":true,\"details\":\"Host isolated\",\"retryable\":false,\"metadata\":{}}");

        var executor = buildExecutor(Map.of("isolate.host", "test"));
        ContainmentResult result = executor.execute("isolate.host", Map.of("hostId", "srv-42"), ctx());

        assertThat(result.success()).isTrue();
        assertThat(result.details()).isEqualTo("Host isolated");
    }

    @Test
    void retryableFailure_serverError() {
        nextStatus.set(503);
        nextResponse.set("{\"error\":\"service unavailable\"}");

        var executor = buildExecutor(Map.of("isolate.host", "test"));
        ContainmentResult result = executor.execute("isolate.host", Map.of(), ctx());

        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isTrue();
    }

    @Test
    void permanentFailure_clientError() {
        nextStatus.set(400);
        nextResponse.set("{\"error\":\"bad request\"}");

        var executor = buildExecutor(Map.of("isolate.host", "test"));
        ContainmentResult result = executor.execute("isolate.host", Map.of(), ctx());

        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isFalse();
    }

    @Test
    void retryableFailure_429() {
        nextStatus.set(429);
        nextResponse.set("{\"error\":\"rate limited\"}");

        var executor = buildExecutor(Map.of("isolate.host", "test"));
        ContainmentResult result = executor.execute("isolate.host", Map.of(), ctx());

        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isTrue();
    }

    @Test
    void unmappedActionType_logsAndReturnsSuccess() {
        var executor = buildExecutor(Map.of());
        ContainmentResult result = executor.execute("enable.enhanced.logging", Map.of(), ctx());

        assertThat(result.success()).isTrue();
        assertThat(result.details()).contains("no connector");
    }

    @Test
    void malformedResponse_permanentFailure() {
        nextStatus.set(200);
        nextResponse.set("not json at all");

        var executor = buildExecutor(Map.of("isolate.host", "test"));
        ContainmentResult result = executor.execute("isolate.host", Map.of(), ctx());

        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isFalse();
    }

    @Test
    void unresolvedEndpointTag_permanentFailure() {
        var resolver = new ContainmentEndpointResolver();
        resolver.initialize(Map.of());
        var executor = new HttpContainmentExecutor(resolver, MAPPER, Map.of("isolate.host", "missing"));

        ContainmentResult result = executor.execute("isolate.host", Map.of(), ctx());

        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isFalse();
        assertThat(result.errorReason()).contains("missing");
    }
}
