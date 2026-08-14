package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SocCaseCapabilitiesTest {

    @Test
    void iocEnrichment_matchesCaseYamlCapabilityName() {
        assertEquals("ioc-enrichment", SocCaseCapabilities.IOC_ENRICHMENT);
    }

    @Test
    void attckMapping_matchesCaseYamlCapabilityName() {
        assertEquals("attck-mapping", SocCaseCapabilities.ATTCK_MAPPING);
    }

    @Test
    void containmentRecommendation_matchesCaseYamlCapabilityName() {
        assertEquals("containment-recommendation", SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);
    }
}
