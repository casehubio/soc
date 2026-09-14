package io.casehub.soc.connector.paloalto;

import io.casehub.soc.engine.spi.ContainmentRequest;
import io.casehub.soc.engine.spi.ContainmentResponse;
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
import java.util.Set;

@Path("/paloalto/containment")
@ApplicationScoped
public class PaloAltoContainmentConnector {

    private static final Logger LOG = Logger.getLogger(PaloAltoContainmentConnector.class);

    private static final Set<String> SUPPORTED_ACTIONS =
            Set.of("block.ip", "block.domain", "network.segmentation");

    @Inject
    PaloAltoApiClient apiClient;

    @ConfigProperty(name = "casehub.soc.paloalto.device-name",
                     defaultValue = "localhost.localdomain")
    String deviceName;

    @ConfigProperty(name = "casehub.soc.paloalto.vsys",
                     defaultValue = "vsys1")
    String vsys;

    @ConfigProperty(name = "casehub.soc.paloalto.default-address-group",
                     defaultValue = "casehub-blocked-ips")
    String defaultAddressGroup;

    @ConfigProperty(name = "casehub.soc.paloalto.default-url-category",
                     defaultValue = "casehub-blocked-domains")
    String defaultUrlCategory;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ContainmentResponse execute(ContainmentRequest request) {
        ContainmentResponse validation = validateAndExtract(request);
        if (validation != null) {
            return validation;
        }

        try {
            return switch (request.actionType()) {
                case "block.ip" -> executeBlockIp(request);
                case "block.domain" -> executeBlockDomain(request);
                case "network.segmentation" -> executeNetworkSegmentation(request);
                default -> new ContainmentResponse(false, null,
                        "Unsupported PAN-OS action type: " + request.actionType(),
                        false, Map.of());
            };
        } catch (PaloAltoApiException e) {
            LOG.warnf("PAN-OS API failed for %s: %s", request.actionType(), e.getMessage());
            boolean retryable = e.code() == 429 || e.code() >= 500
                    || e.getMessage().contains("unreachable")
                    || e.getMessage().contains("timed out")
                    || e.getMessage().contains("commit failed");
            return new ContainmentResponse(false, null,
                    e.getMessage(), retryable,
                    e.code() > 0 ? Map.of("paloalto_code", e.code()) : Map.of());
        }
    }

    private ContainmentResponse executeBlockIp(ContainmentRequest request) {
        String ip = request.parameters().get("ip").toString();
        String addressGroup = paramOrDefault(request, "addressGroup", defaultAddressGroup);
        String sanitized = sanitizeIp(ip);
        String objectName = "casehub-" + sanitized;

        apiClient.setConfig(
                buildAddressXpath(objectName),
                "<ip-netmask>" + ip + "/32</ip-netmask>");

        apiClient.setConfig(
                buildAddressGroupMemberXpath(addressGroup),
                "<member>" + objectName + "</member>");

        String jobId = apiClient.commit();

        return new ContainmentResponse(true,
                "IP " + ip + " blocked via " + addressGroup,
                null, false,
                Map.of("paloalto_job_id", jobId,
                       "paloalto_address_object", objectName));
    }

    private ContainmentResponse executeBlockDomain(ContainmentRequest request) {
        String domain = request.parameters().get("domain").toString();
        String urlCategory = paramOrDefault(request, "urlCategory", defaultUrlCategory);

        apiClient.setConfig(
                buildUrlCategoryMemberXpath(urlCategory),
                "<member>" + domain + "</member>");

        String jobId = apiClient.commit();

        return new ContainmentResponse(true,
                "Domain " + domain + " blocked via " + urlCategory,
                null, false,
                Map.of("paloalto_job_id", jobId));
    }

    private ContainmentResponse executeNetworkSegmentation(ContainmentRequest request) {
        String sourceZone = request.parameters().get("sourceZone").toString();
        String destZone = request.parameters().get("destZone").toString();
        String ruleName = request.parameters().get("ruleName").toString();

        String element = "<from><member>" + sourceZone + "</member></from>"
                + "<to><member>" + destZone + "</member></to>"
                + "<source><member>any</member></source>"
                + "<destination><member>any</member></destination>"
                + "<application><member>any</member></application>"
                + "<service><member>application-default</member></service>"
                + "<action>deny</action>"
                + "<log-end>yes</log-end>";

        apiClient.setConfig(buildSecurityRuleXpath(ruleName), element);

        String jobId = apiClient.commit();

        return new ContainmentResponse(true,
                "Zone segmentation " + sourceZone + "→" + destZone
                        + " deny rule " + ruleName + " applied",
                null, false,
                Map.of("paloalto_job_id", jobId,
                       "paloalto_rule_name", ruleName));
    }

    boolean isSupportedAction(String actionType) {
        return SUPPORTED_ACTIONS.contains(actionType);
    }

    ContainmentResponse validateAndExtract(ContainmentRequest request) {
        if (!isSupportedAction(request.actionType())) {
            return new ContainmentResponse(false, null,
                    "Unsupported PAN-OS action type: " + request.actionType(),
                    false, Map.of());
        }

        return switch (request.actionType()) {
            case "block.ip" -> requireParam(request, "ip");
            case "block.domain" -> requireParam(request, "domain");
            case "network.segmentation" -> {
                ContainmentResponse r = requireParam(request, "sourceZone");
                if (r != null) yield r;
                r = requireParam(request, "destZone");
                if (r != null) yield r;
                yield requireParam(request, "ruleName");
            }
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

    private String paramOrDefault(ContainmentRequest request, String param, String defaultValue) {
        Object value = request.parameters().get(param);
        return (value != null && !value.toString().isBlank()) ? value.toString() : defaultValue;
    }

    static String sanitizeIp(String ip) {
        return ip.replace('.', '-');
    }

    String buildAddressXpath(String objectName) {
        return "/config/devices/entry[@name='" + deviceName + "']"
                + "/vsys/entry[@name='" + vsys + "']"
                + "/address/entry[@name='" + objectName + "']";
    }

    String buildAddressGroupMemberXpath(String groupName) {
        return "/config/devices/entry[@name='" + deviceName + "']"
                + "/vsys/entry[@name='" + vsys + "']"
                + "/address-group/entry[@name='" + groupName + "']/static";
    }

    String buildUrlCategoryMemberXpath(String categoryName) {
        return "/config/devices/entry[@name='" + deviceName + "']"
                + "/vsys/entry[@name='" + vsys + "']"
                + "/profiles/custom-url-category/entry[@name='" + categoryName + "']/list";
    }

    String buildSecurityRuleXpath(String ruleName) {
        return "/config/devices/entry[@name='" + deviceName + "']"
                + "/vsys/entry[@name='" + vsys + "']"
                + "/rulebase/security/rules/entry[@name='" + ruleName + "']";
    }
}
