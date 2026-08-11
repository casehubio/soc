package io.casehub.soc.engine.compliance;

import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;
import java.util.regex.Pattern;

@ApplicationScoped
public class SocPiiSanitiser {

    private static final Logger LOG = Logger.getLogger(SocPiiSanitiser.class);

    private static final Pattern IPV4 = Pattern.compile(
            "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b");

    private static final Pattern IPV6 = Pattern.compile(
            "(?i)(?:" +
            "(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}" +
            "|(?:[0-9a-f]{1,4}:){1,7}:" +
            "|(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}" +
            "|(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}" +
            "|(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}" +
            "|(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}" +
            "|(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}" +
            "|[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}" +
            "|::(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4}" +
            "|::)");

    private static final Pattern EMAIL = Pattern.compile(
            "\\b[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}\\b");

    private static final String REDACTED_IP = "[REDACTED-IP]";
    private static final String REDACTED_EMAIL = "[REDACTED-EMAIL]";
    private static final String SANITISATION_FAILED = "[SANITISATION_FAILED]";

    public String sanitise(String input) {
        if (input == null) {
            return SANITISATION_FAILED;
        }
        try {
            String result = EMAIL.matcher(input).replaceAll(REDACTED_EMAIL);
            result = IPV4.matcher(result).replaceAll(REDACTED_IP);
            result = IPV6.matcher(result).replaceAll(REDACTED_IP);
            return result;
        } catch (Exception e) {
            LOG.errorf(e, "PII sanitisation failed");
            return SANITISATION_FAILED;
        }
    }
}
