package io.casehub.soc.engine.compliance;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.assertThat;

class SocPiiSanitiserTest {

    private SocPiiSanitiser sanitiser;

    @BeforeEach
    void setUp() { sanitiser = new SocPiiSanitiser(); }

    @ParameterizedTest
    @CsvSource({
        "'10.0.0.1',          '[REDACTED-IP]'",
        "'192.168.1.100',     '[REDACTED-IP]'",
        "'255.255.255.255',   '[REDACTED-IP]'",
    })
    void ipv4_redacted(String input, String expected) {
        assertThat(sanitiser.sanitise(input)).isEqualTo(expected);
    }

    @Test
    void ipv6_compressed_redacted() {
        assertThat(sanitiser.sanitise("::1")).isEqualTo("[REDACTED-IP]");
    }

    @Test
    void ipv6_full_redacted() {
        assertThat(sanitiser.sanitise("2001:0db8:0000:0000:0000:0000:0000:0001")).isEqualTo("[REDACTED-IP]");
    }

    @Test
    void email_redacted() {
        assertThat(sanitiser.sanitise("user@example.com")).isEqualTo("[REDACTED-EMAIL]");
        assertThat(sanitiser.sanitise("first.last+tag@corp.co.uk")).isEqualTo("[REDACTED-EMAIL]");
    }

    @Test
    void preserves_attckIds() {
        assertThat(sanitiser.sanitise("T1566.001")).isEqualTo("T1566.001");
    }

    @Test
    void preserves_uuids() {
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        assertThat(sanitiser.sanitise(uuid)).isEqualTo(uuid);
    }

    @Test
    void preserves_severity_values() {
        assertThat(sanitiser.sanitise("CRITICAL")).isEqualTo("CRITICAL");
    }

    @Test
    void mixed_content_redacted() {
        String input = "{\"src_ip\":\"10.0.0.1\",\"attck\":\"T1566\",\"analyst\":\"user@acme.com\"}";
        String result = sanitiser.sanitise(input);
        assertThat(result).contains("[REDACTED-IP]");
        assertThat(result).contains("[REDACTED-EMAIL]");
        assertThat(result).contains("T1566");
        assertThat(result).doesNotContain("10.0.0.1");
        assertThat(result).doesNotContain("user@acme.com");
    }

    @Test
    void nullInput_returnsSanitisationFailed() {
        assertThat(sanitiser.sanitise(null)).isEqualTo("[SANITISATION_FAILED]");
    }
}
