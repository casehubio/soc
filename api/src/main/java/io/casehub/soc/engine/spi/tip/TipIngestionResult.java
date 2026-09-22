package io.casehub.soc.engine.spi.tip;

import java.util.List;

public record TipIngestionResult(
        String feedId,
        int chunksIngested,
        int mindMapNodesLinked,
        List<String> errors
) {

    public TipIngestionResult {
        errors = errors != null ? List.copyOf(errors) : List.of();
    }

    public boolean succeeded() {
        return errors.isEmpty();
    }

    public static TipIngestionResult success(String feedId, int chunksIngested, int mindMapNodesLinked) {
        return new TipIngestionResult(feedId, chunksIngested, mindMapNodesLinked, List.of());
    }

    public static TipIngestionResult failure(String feedId, List<String> errors) {
        return new TipIngestionResult(feedId, 0, 0, errors);
    }
}
