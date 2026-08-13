package io.casehub.soc.engine;

import io.casehub.soc.detection.BruteForceDetectorGanglion;
import io.casehub.soc.detection.SiemAlertGanglion;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

@ApplicationScoped
public class SocGanglionProducer {

    @Produces
    @ApplicationScoped
    SiemAlertGanglion siemAlertGanglion() {
        return new SiemAlertGanglion();
    }

    @Produces
    @ApplicationScoped
    BruteForceDetectorGanglion bruteForceDetectorGanglion() {
        return new BruteForceDetectorGanglion();
    }
}
