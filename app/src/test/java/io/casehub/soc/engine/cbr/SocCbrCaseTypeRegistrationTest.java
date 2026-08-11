package io.casehub.soc.engine.cbr;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SocCbrCaseTypeRegistrationTest {

    @Test
    void cbrType_matchesSocIncidentCbrCase() {
        var reg = new SocCbrCaseTypeRegistration();
        assertThat(reg.cbrType()).isEqualTo(SocIncidentCbrCase.CBR_TYPE);
    }

    @Test
    void caseClass_isSocIncidentCbrCase() {
        var reg = new SocCbrCaseTypeRegistration();
        assertThat(reg.caseClass()).isEqualTo(SocIncidentCbrCase.class);
    }
}
