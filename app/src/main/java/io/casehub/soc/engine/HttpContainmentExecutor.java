package io.casehub.soc.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.casehub.soc.engine.spi.ContainmentContext;
import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.ext.web.client.HttpResponse;
import io.vertx.ext.web.client.WebClient;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.Config;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class HttpContainmentExecutor implements ContainmentExecutor {

    private static final Logger LOG = Logger.getLogger(HttpContainmentExecutor.class);
    private static final String ROUTING_PREFIX = "casehub.soc.containment.routing.";

    private final ContainmentEndpointResolver endpointResolver;
    private final ObjectMapper objectMapper;
    private final Map<String, String> actionRouting;
    private WebClient webClient;

    @Inject
    Config config;

    @Inject
    io.vertx.mutiny.core.Vertx mutinyVertx;

    HttpContainmentExecutor(ContainmentEndpointResolver endpointResolver,
                            ObjectMapper objectMapper,
                            Map<String, String> actionRouting) {
        this.endpointResolver = endpointResolver;
        this.objectMapper = objectMapper;
        this.actionRouting = new LinkedHashMap<>(actionRouting);
    }

    @Inject
    HttpContainmentExecutor(ContainmentEndpointResolver endpointResolver,
                            ObjectMapper objectMapper) {
        this.endpointResolver = endpointResolver;
        this.objectMapper = objectMapper;
        this.actionRouting = new LinkedHashMap<>();
    }

    @PostConstruct
    void init() {
        if (config != null) {
            for (String key : config.getPropertyNames()) {
                if (key.startsWith(ROUTING_PREFIX)) {
                    String hyphenated = key.substring(ROUTING_PREFIX.length());
                    String actionType = hyphenated.replace('-', '.');
                    config.getOptionalValue(key, String.class)
                            .ifPresent(tag -> actionRouting.put(actionType, tag));
                }
            }
        }
        if (mutinyVertx != null) {
            webClient = WebClient.create(mutinyVertx.getDelegate());
        }
    }

    @Override
    public ContainmentResult execute(String actionType, Map<String, Object> parameters,
                                     ContainmentContext context) {
        String endpointTag = actionRouting.get(actionType);
        if (endpointTag == null) {
            LOG.infof("No routing for %s — logging only (no connector)", actionType);
            return ContainmentResult.success("Logged (no connector): " + actionType, Instant.now());
        }

        ContainmentEndpoint endpoint;
        try {
            endpoint = endpointResolver.resolve(endpointTag);
        } catch (IllegalStateException e) {
            return ContainmentResult.failure(e.getMessage(), false);
        }

        ContainmentRequest request = ContainmentRequest.from(actionType, parameters, context);

        try {
            String body = objectMapper.writeValueAsString(request);
            int timeoutMs = endpoint.timeoutSeconds() * 1000;

            WebClient client = webClient != null ? webClient : WebClient.create(Vertx.vertx());

            HttpResponse<Buffer> response = client
                    .postAbs(endpoint.url())
                    .timeout(timeoutMs)
                    .putHeader("Content-Type", "application/json")
                    .sendBuffer(Buffer.buffer(body))
                    .toCompletionStage()
                    .toCompletableFuture()
                    .get(timeoutMs + 5000L, TimeUnit.MILLISECONDS);

            return handleResponse(response);
        } catch (Exception e) {
            LOG.warnf("Containment HTTP call failed for %s -> %s: %s",
                    actionType, endpointTag, e.getMessage());
            return ContainmentResult.failure("HTTP call failed: " + e.getMessage(), true);
        }
    }

    private ContainmentResult handleResponse(HttpResponse<Buffer> response) {
        int status = response.statusCode();

        if (status >= 200 && status < 300) {
            Buffer body = response.body();
            if (body == null || body.length() == 0) {
                return ContainmentResult.success("No response body", Instant.now());
            }
            try {
                ContainmentResponse cr = objectMapper.readValue(
                        body.getBytes(), ContainmentResponse.class);
                return cr.toResult();
            } catch (Exception e) {
                return ContainmentResult.failure(
                        "Malformed connector response: " + e.getMessage(), false);
            }
        }

        if (status == 429) {
            return ContainmentResult.failure("Rate limited (429)", true);
        }

        if (status >= 400 && status < 500) {
            return ContainmentResult.failure(status + " client error", false);
        }

        return ContainmentResult.failure(status + " server error", true);
    }
}
