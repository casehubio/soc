package io.casehub.soc.connector.paloalto;

public class PaloAltoApiException extends RuntimeException {
    private final int code;

    public PaloAltoApiException(String message) {
        super(message);
        this.code = -1;
    }

    public PaloAltoApiException(String message, int code) {
        super(message);
        this.code = code;
    }

    public PaloAltoApiException(String message, Throwable cause) {
        super(message, cause);
        this.code = -1;
    }

    public int code() {
        return code;
    }
}
