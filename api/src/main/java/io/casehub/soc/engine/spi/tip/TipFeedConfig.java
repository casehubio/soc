package io.casehub.soc.engine.spi.tip;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;

public record TipFeedConfig(
        String feedId,
        String providerName,
        String corpusName,
        Duration pollInterval,
        Map<String, String> credentials,
        String endpointUrl,
        boolean linkToMindMap
) {

    public TipFeedConfig {
        Objects.requireNonNull(feedId, "feedId");
        Objects.requireNonNull(providerName, "providerName");
        Objects.requireNonNull(corpusName, "corpusName");
        Objects.requireNonNull(pollInterval, "pollInterval");
        credentials = credentials != null ? Map.copyOf(credentials) : Map.of();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String feedId;
        private String providerName;
        private String corpusName;
        private Duration pollInterval;
        private Map<String, String> credentials = Map.of();
        private String endpointUrl;
        private boolean linkToMindMap;

        private Builder() {}

        public Builder feedId(String feedId) { this.feedId = feedId; return this; }
        public Builder providerName(String providerName) { this.providerName = providerName; return this; }
        public Builder corpusName(String corpusName) { this.corpusName = corpusName; return this; }
        public Builder pollInterval(Duration pollInterval) { this.pollInterval = pollInterval; return this; }
        public Builder credentials(Map<String, String> credentials) { this.credentials = credentials; return this; }
        public Builder endpointUrl(String endpointUrl) { this.endpointUrl = endpointUrl; return this; }
        public Builder linkToMindMap(boolean linkToMindMap) { this.linkToMindMap = linkToMindMap; return this; }

        public TipFeedConfig build() {
            return new TipFeedConfig(feedId, providerName, corpusName,
                pollInterval, credentials, endpointUrl, linkToMindMap);
        }
    }
}
