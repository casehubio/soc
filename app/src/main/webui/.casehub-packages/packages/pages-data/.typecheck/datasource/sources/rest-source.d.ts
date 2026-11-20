import type { DataSource } from "../types.js";
import type { DataSetId } from "../../dataset/types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
import type { PresetRegistry } from "../../dataset/external/types.js";
import { HttpMethod } from "../../dataset/external/types.js";
import type { WsTriggerPool, WsTriggerEvent } from "./ws-trigger-pool.js";
export interface RestSourceOptions {
    readonly method?: HttpMethod;
    readonly headers?: Record<string, string>;
    readonly query?: Record<string, string>;
    readonly form?: Record<string, string>;
    readonly body?: string;
    readonly dataPath?: string;
    readonly type?: string;
    readonly expression?: string;
    readonly columns?: readonly ExternalColumnDef[];
    readonly refreshTime?: string;
    readonly accumulate?: boolean;
    readonly totalPath?: string;
    readonly cacheEnabled?: boolean;
    readonly fetchFn?: typeof globalThis.fetch;
    readonly presets?: PresetRegistry;
    readonly triggerUrl?: string;
    readonly triggerFilter?: (event: WsTriggerEvent) => boolean;
    readonly triggerPool?: WsTriggerPool;
}
export declare function restSource(url: string, _id: DataSetId, options?: RestSourceOptions): DataSource;
//# sourceMappingURL=rest-source.d.ts.map