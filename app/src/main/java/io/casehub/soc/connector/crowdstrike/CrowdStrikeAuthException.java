package io.casehub.soc.connector.crowdstrike;

public class CrowdStrikeAuthException extends RuntimeException {
    public CrowdStrikeAuthException(String message) {
        super(message);
    }

    public CrowdStrikeAuthException(String message, Throwable cause) {
        super(message, cause);
    }
}
