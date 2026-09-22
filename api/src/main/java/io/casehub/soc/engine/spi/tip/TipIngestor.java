package io.casehub.soc.engine.spi.tip;

public interface TipIngestor {

    TipIngestionResult ingest(TipFeedConfig config, String tenantId);

    String providerName();
}
