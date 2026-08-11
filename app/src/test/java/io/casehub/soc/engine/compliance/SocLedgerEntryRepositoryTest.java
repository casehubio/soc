package io.casehub.soc.engine.compliance;

import io.casehub.soc.domain.SocStepType;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SocLedgerEntryRepositoryTest {

    @Test
    void classExists_andHasExpectedMethods() throws NoSuchMethodException {
        var clazz = SocLedgerEntryRepository.class;
        assertThat(clazz.getMethod("findByIncidentId", java.util.UUID.class, String.class))
                .isNotNull();
        assertThat(clazz.getMethod("findByTimeRange", java.time.Instant.class,
                java.time.Instant.class, String.class)).isNotNull();
        assertThat(clazz.getMethod("findByStepType", SocStepType.class, String.class))
                .isNotNull();
    }
}
