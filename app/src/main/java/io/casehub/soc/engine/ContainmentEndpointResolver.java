package io.casehub.soc.engine;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.Config;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@ApplicationScoped
public class ContainmentEndpointResolver {

    private static final String PREFIX = "casehub.soc.containment.endpoints.";

    @Inject
    Config config;

    private final Map<String, ContainmentEndpoint> endpoints = new HashMap<>();

    @PostConstruct
    void init() {
        if (config != null) {
            initialize(loadFromConfig());
        }
    }

    void initialize(Map<String, String> properties) {
        endpoints.clear();
        Map<String, Map<String, String>> grouped = new LinkedHashMap<>();

        properties.forEach((key, value) -> {
            if (key.startsWith(PREFIX)) {
                String remainder = key.substring(PREFIX.length());
                int dot = remainder.indexOf('.');
                if (dot > 0) {
                    String tag = remainder.substring(0, dot);
                    String prop = remainder.substring(dot + 1);
                    grouped.computeIfAbsent(tag, k -> new LinkedHashMap<>()).put(prop, value);
                }
            }
        });

        grouped.forEach((tag, props) -> {
            String url = props.get("url");
            if (url != null && !url.isBlank()) {
                String method = props.getOrDefault("method", ContainmentEndpoint.DEFAULT_METHOD);
                int timeout = parseTimeout(props.get("timeout-seconds"));
                endpoints.put(tag, new ContainmentEndpoint(url, method, timeout));
            }
        });
    }

    public ContainmentEndpoint resolve(String endpointTag) {
        ContainmentEndpoint ep = endpoints.get(endpointTag);
        if (ep == null) {
            throw new IllegalStateException(
                    "No containment endpoint configured for tag: " + endpointTag
                    + ". Add casehub.soc.containment.endpoints." + endpointTag + ".url to config.");
        }
        return ep;
    }

    private Map<String, String> loadFromConfig() {
        Map<String, String> result = new LinkedHashMap<>();
        for (String key : config.getPropertyNames()) {
            if (key.startsWith(PREFIX)) {
                config.getOptionalValue(key, String.class)
                        .ifPresent(value -> result.put(key, value));
            }
        }
        return result;
    }

    private static int parseTimeout(String value) {
        if (value == null || value.isBlank()) {
            return ContainmentEndpoint.DEFAULT_TIMEOUT_SECONDS;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return ContainmentEndpoint.DEFAULT_TIMEOUT_SECONDS;
        }
    }
}
