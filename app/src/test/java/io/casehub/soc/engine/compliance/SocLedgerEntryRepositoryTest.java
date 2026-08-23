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

    @Test
    void findFiltered_methodExists() throws NoSuchMethodException {
        assertThat(SocLedgerEntryRepository.class.getMethod("findFiltered",
                                                            java.time.Instant.class, java.time.Instant.class,
                                                            io.casehub.soc.domain.SocStepType.class, String.class, java.util.UUID.class,
                                                            int.class, int.class, String.class)).isNotNull();
    }

    @Test
    void countFiltered_methodExists() throws NoSuchMethodException {
        assertThat(SocLedgerEntryRepository.class.getMethod("countFiltered",
                                                            java.time.Instant.class, java.time.Instant.class,
                                                            io.casehub.soc.domain.SocStepType.class, String.class, java.util.UUID.class,
                                                            String.class)).isNotNull();
    }

    @Test
    void findDistinctActors_methodExists() throws NoSuchMethodException {
        assertThat(SocLedgerEntryRepository.class.getMethod("findDistinctActors",
                                                            java.time.Instant.class, java.time.Instant.class, String.class)).isNotNull();
    }
}
