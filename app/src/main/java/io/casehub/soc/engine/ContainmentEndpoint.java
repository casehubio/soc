package io.casehub.soc.engine;

public record ContainmentEndpoint(String url, String method, int timeoutSeconds) {
    public static final String DEFAULT_METHOD = "POST";
    public static final int DEFAULT_TIMEOUT_SECONDS = 30;
}
