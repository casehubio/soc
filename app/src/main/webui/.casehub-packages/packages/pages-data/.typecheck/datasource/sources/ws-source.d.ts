import type { DataSource } from "../types.js";
import type { DataSetId } from "../../dataset/types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
import type { PushPool } from "../../dataset/external/sources/push-pool.js";
export interface WsSourceOptions {
    readonly dataPath?: string;
    readonly expression?: string;
    readonly columns?: readonly ExternalColumnDef[];
    readonly keyColumn?: string;
    readonly cacheMaxRows?: number;
    readonly accumulate?: boolean;
    readonly pool?: PushPool;
}
export declare function wsSource(url: string, dataSetId: DataSetId, options?: WsSourceOptions): DataSource;
//# sourceMappingURL=ws-source.d.ts.map