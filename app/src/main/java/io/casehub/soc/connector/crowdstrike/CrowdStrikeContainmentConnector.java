package io.casehub.soc.connector.crowdstrike;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.ext.web.client.HttpResponse;
import io.vertx.ext.web.client.WebClient;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Path("/crowdstrike/containment")
@ApplicationScoped
public class CrowdStrikeContainmentConnector {

    private static final Logger LOG = Logger.getLogger(CrowdStrikeContainmentConnector.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final Map<String, String> ACTION_MAP = Map.of(
            "isolate.host", "contain",
            "wipe.endpoint", "lift_containment");

    @Inject
    CrowdStrikeOAuth2Client oAuth2Client;

    @Inject
    Vertx vertx;

    WebClient webClient;

    @PostConstruct
    void init() {
        webClient = WebClient.create(vertx);
    }

    @ConfigProperty(name = "casehub.soc.crowdstrike.api-base",
                     defaultValue = "https://api.crowdstrike.com")
    String apiBase;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ContainmentResponse execute(ContainmentRequest request) {
        ContainmentResponse validation = validateAndExtract(request);
        if (validation != null) {
            return validation;
        }

        String deviceId = request.parameters().get("deviceId").toString();
        String actionName = mapActionName(request.actionType());

        try {
            String token = oAuth2Client.getAccessToken();
            return callCrowdStrikeApi(actionName, deviceId, token, request);
        } catch (CrowdStrikeAuthException e) {
            LOG.warnf("CrowdStrike auth failed for %s: %s", request.actionType(), e.getMessage());
            return new ContainmentResponse(false, null,
                    "CrowdStrike authentication failed: " + e.getMessage(), true, Map.of());
        }
    }

    String mapActionName(String actionType) {
        return ACTION_MAP.get(actionType);
    }

    ContainmentResponse validateAndExtract(ContainmentRequest request) {
        String actionName = mapActionName(request.actionType());
        if (actionName == null) {
            return new ContainmentResponse(false, null,
                    "Unsupported CrowdStrike action type: " + request.actionType(),
                    false, Map.of());
        }

        Object deviceId = request.parameters().get("deviceId");
        if (deviceId == null || deviceId.toString().isBlank()) {
            return new ContainmentResponse(false, null,
                    "Missing required parameter: deviceId", false, Map.of());
        }

        return null;
    }

    private ContainmentResponse callCrowdStrikeApi(String actionName, String deviceId,
                                                    String token, ContainmentRequest request) {
        String url = apiBase + "/devices/entities/devices-actions/v2?action_name=" + actionName;

        ObjectNode body = MAPPER.createObjectNode();
        ArrayNode ids = body.putArray("ids");
        ids.add(deviceId);

        try {
            HttpResponse<Buffer> response = webClient
                    .postAbs(url)
                    .putHeader("Authorization", "Bearer " + token)
                    .putHeader("Content-Type", "application/json")
                    .sendBuffer(Buffer.buffer(MAPPER.writeValueAsBytes(body)))
                    .toCompletionStage()
                    .toCompletableFuture()
                    .get(request.timeoutMs(), TimeUnit.MILLISECONDS);

            return handleCrowdStrikeResponse(response, deviceId, actionName);
        } catch (Exception e) {
            LOG.warnf("CrowdStrike API call failed: %s", e.getMessage());
            return new ContainmentResponse(false, null,
                    "CrowdStrike unreachable: " + e.getMessage(), true, Map.of());
        }
    }

    private ContainmentResponse handleCrowdStrikeResponse(HttpResponse<Buffer> response,
                                                           String deviceId, String actionName) {
        int status = response.statusCode();

        if (status == 429) {
            return new ContainmentResponse(false, null,
                    "CrowdStrike rate limited", true, Map.of());
        }

        if (status >= 500) {
            return new ContainmentResponse(false, null,
                    "CrowdStrike server error: " + status, true, Map.of());
        }

        if (status >= 400) {
            return new ContainmentResponse(false, null,
                    "CrowdStrike error: " + status, false, Map.of());
        }

        try {
            JsonNode json = MAPPER.readTree(response.body().getBytes());
            JsonNode errors = json.path("errors");
            if (errors.isArray() && !errors.isEmpty()) {
                String firstError = errors.get(0).path("message").asText("Unknown error");
                return new ContainmentResponse(false, null, firstError, false,
                        Map.of("crowdstrike_errors", errors.toString()));
            }

            return new ContainmentResponse(true,
                    "Host " + deviceId + " " + actionName,
                    null, false,
                    Map.of("crowdstrike_device_id", deviceId, "action_name", actionName));
        } catch (Exception e) {
            return new ContainmentResponse(false, null,
                    "Failed to parse CrowdStrike response: " + e.getMessage(), false, Map.of());
        }
    }
}
