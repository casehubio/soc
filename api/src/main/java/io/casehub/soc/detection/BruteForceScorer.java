package io.casehub.soc.detection;

import io.cloudevents.CloudEvent;

public interface BruteForceScorer {

    double score(CloudEvent event);

    BruteForceScorer DEFAULT = event -> 0.9;
}
