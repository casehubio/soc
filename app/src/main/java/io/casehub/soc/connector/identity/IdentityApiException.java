package io.casehub.soc.connector.identity;

public class IdentityApiException extends RuntimeException {
    private final int statusCode;

    public IdentityApiException(String message) {
        super(message);
        this.statusCode = -1;
    }

    public IdentityApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public IdentityApiException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = -1;
    }

    public int statusCode() {
        return statusCode;
    }
}
