package io.casehub.soc.worker.contract;

import java.util.List;

public record IocEnrichmentOutput(
        List<IocEntry> iocs,
        String summary) {

    public record IocEntry(String type, String value, String source) {}
}
