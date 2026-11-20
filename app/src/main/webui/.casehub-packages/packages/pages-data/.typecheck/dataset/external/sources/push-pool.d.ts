import type { PushSource, PushSourceConfig } from "./push-source.js";
export interface PushPool {
    configure(config: PushSourceConfig): void;
    acquire(baseUrl: string): PushSource;
    releaseAll(): void;
}
export declare function createPushPool(factory: (baseUrl: string, config?: PushSourceConfig) => PushSource): PushPool;
//# sourceMappingURL=push-pool.d.ts.map