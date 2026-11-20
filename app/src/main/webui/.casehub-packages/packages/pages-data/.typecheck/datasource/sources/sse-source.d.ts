import type { DataSource } from "../types.js";
import type { DataSetId } from "../../dataset/types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
import type { PushPool } from "../../dataset/external/sources/push-pool.js";
export interface SseSourceOptions {
    readonly dataPath?: string;
    readonly expression?: string;
    readonly columns?: readonly ExternalColumnDef[];
    readonly keyColumn?: string;
    readonly cacheMaxRows?: number;
    readonly accumulate?: boolean;
    readonly pool?: PushPool;
}
export declare function sseSource(url: string, dataSetId: DataSetId, options?: SseSourceOptions): DataSource;
//# sourceMappingURL=sse-source.d.ts.map