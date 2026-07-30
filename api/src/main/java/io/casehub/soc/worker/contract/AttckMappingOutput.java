package io.casehub.soc.worker.contract;

import java.util.List;

public record AttckMappingOutput(
        List<TechniqueEntry> techniques,
        String primaryTactic,
        double confidence,
        String narrative) {

    public record TechniqueEntry(String technique, double confidence, String evidence) {}
}
