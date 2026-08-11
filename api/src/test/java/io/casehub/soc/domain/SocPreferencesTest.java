package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SocPreferencesTest {

    @Test
    void p1ResponseWindow_defaults15Minutes() {
        assertEquals(Duration.ofMinutes(15), SocPreferences.P1_RESPONSE_WINDOW.defaultValue().duration());
    }

    @Test
    void p2ResponseWindow_defaults1Hour() {
        assertEquals(Duration.ofHours(1), SocPreferences.P2_RESPONSE_WINDOW.defaultValue().duration());
    }

    @Test
    void p3ResponseWindow_defaults4Hours() {
        assertEquals(Duration.ofHours(4), SocPreferences.P3_RESPONSE_WINDOW.defaultValue().duration());
    }

    @Test
    void p4ResponseWindow_defaults24Hours() {
        assertEquals(Duration.ofHours(24), SocPreferences.P4_RESPONSE_WINDOW.defaultValue().duration());
    }

    @Test
    void allKeysHaveSocNamespace() {
        assertEquals("soc", SocPreferences.P1_RESPONSE_WINDOW.namespace());
        assertEquals("soc", SocPreferences.P2_RESPONSE_WINDOW.namespace());
        assertEquals("soc", SocPreferences.P3_RESPONSE_WINDOW.namespace());
        assertEquals("soc", SocPreferences.P4_RESPONSE_WINDOW.namespace());
    }
}
