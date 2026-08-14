package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SocTrustDimensionsTest {

    @Test
    void triageAccuracy_matchesKebabCaseConvention() {
        assertEquals("triage-accuracy", SocTrustDimensions.TRIAGE_ACCURACY);
    }

    @Test
    void containmentAppropriateness_matchesKebabCaseConvention() {
        assertEquals("containment-appropriateness", SocTrustDimensions.CONTAINMENT_APPROPRIATENESS);
    }
}
