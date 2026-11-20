import type { PushSource, PushSourceConfig } from "./push-source.js";

export interface PushPool {
  configure(config: PushSourceConfig): void;
  acquire(baseUrl: string): PushSource;
  releaseAll(): void;
}

export function createPushPool(
  factory: (baseUrl: string, config?: PushSourceConfig) => PushSource,
): PushPool {
  const sources = new Map<string, PushSource>();
  let config: PushSourceConfig | undefined;

  return {
    configure(cfg: PushSourceConfig): void {
      config = cfg;
    },

    acquire(baseUrl: string): PushSource {
      let source = sources.get(baseUrl);
      if (!source) {
        source = factory(baseUrl, config);
        sources.set(baseUrl, source);
      }
      return source;
    },

    releaseAll(): void {
      for (const source of sources.values()) {
        source.close();
      }
      sources.clear();
    },
  };
}
