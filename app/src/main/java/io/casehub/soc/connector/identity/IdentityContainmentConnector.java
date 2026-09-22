package io.casehub.soc.connector.identity;

import io.casehub.platform.api.mcp.HandWrittenEndpoint;
import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.Set;

@Path("/identity/containment")
@ApplicationScoped
@HandWrittenEndpoint("External API proxy for identity provider containment")
public class IdentityContainmentConnector {

    private static final Logger LOG = Logger.getLogger(IdentityContainmentConnector.class);

    private static final Set<String> SUPPORTED_ACTIONS =
            Set.of("disable.user.account", "revoke.credentials", "rotate.api.key");

    @Inject
    IdentityProvider provider;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ContainmentResponse execute(ContainmentRequest request) {
        ContainmentResponse validation = validateAndExtract(request);
        if (validation != null) {
            return validation;
        }

        try {
            IdentityResult result = switch (request.actionType()) {
                case "disable.user.account" ->
                        provider.disableAccount(request.parameters().get("userId").toString());
                case "revoke.credentials" ->
                        provider.revokeSessions(request.parameters().get("userId").toString());
                case "rotate.api.key" ->
                        provider.rotateApiKey(request.parameters().get("appId").toString());
                default -> IdentityResult.failure(
                        "Unsupported identity action: " + request.actionType(), false);
            };

            return new ContainmentResponse(result.success(), result.details(),
                    result.errorReason(), result.retryable(), result.metadata());
        } catch (IdentityApiException e) {
            LOG.warnf("%s API failed for %s: %s",
                    provider.providerName(), request.actionType(), e.getMessage());
            boolean retryable = e.statusCode() == 429 || e.statusCode() >= 500
                    || e.getMessage().contains("unreachable")
                    || e.getMessage().contains("token request failed");
            return new ContainmentResponse(false, null,
                    e.getMessage(), retryable,
                    Map.of("provider", provider.providerName()));
        }
    }

    boolean isSupportedAction(String actionType) {
        return SUPPORTED_ACTIONS.contains(actionType);
    }

    ContainmentResponse validateAndExtract(ContainmentRequest request) {
        if (!isSupportedAction(request.actionType())) {
            return new ContainmentResponse(false, null,
                    "Unsupported identity action type: " + request.actionType(),
                    false, Map.of());
        }

        return switch (request.actionType()) {
            case "disable.user.account", "revoke.credentials" ->
                    requireParam(request, "userId");
            case "rotate.api.key" -> requireParam(request, "appId");
            default -> null;
        };
    }

    private ContainmentResponse requireParam(ContainmentRequest request, String param) {
        Object value = request.parameters().get(param);
        if (value == null || value.toString().isBlank()) {
            return new ContainmentResponse(false, null,
                    "Missing required parameter: " + param, false, Map.of());
        }
        return null;
    }
}
