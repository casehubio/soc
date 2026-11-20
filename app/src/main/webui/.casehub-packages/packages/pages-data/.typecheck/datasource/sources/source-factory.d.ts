import type { SourceFactory } from "../types.js";
import type { PushPool } from "../../dataset/external/sources/push-pool.js";
import type { PresetRegistry } from "../../dataset/external/types.js";
export interface SourceFactoryDeps {
    readonly wsPool?: PushPool;
    readonly ssePool?: PushPool;
    readonly fetchFn?: typeof globalThis.fetch;
    readonly presets?: PresetRegistry;
}
export declare function createSourceFactory(deps?: SourceFactoryDeps): SourceFactory;
//# sourceMappingURL=source-factory.d.ts.map