package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;

class SocStepTypeTest {

    @Test
    void allStepTypesDefined() {
        assertArrayEquals(
                new SocStepType[]{
                        SocStepType.ALERT_TRIAGE,
                        SocStepType.INCIDENT_PROMOTED,
                        SocStepType.INVESTIGATION_STEP,
                        SocStepType.CONTAINMENT_DECISION,
                        SocStepType.CONTAINMENT_EXECUTED,
                        SocStepType.INCIDENT_RESOLVED
                },
                SocStepType.values());
    }
}
