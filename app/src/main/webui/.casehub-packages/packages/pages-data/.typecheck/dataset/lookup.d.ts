import type { DataSetId } from "./types.js";
import type { DataSetOp } from "./ops.js";
export interface DataSetLookup {
    readonly dataSetId: DataSetId;
    readonly operations: readonly DataSetOp[];
    readonly refreshTimeSeconds?: number;
}
export declare function createLookup(dataSetId: DataSetId, operations: readonly DataSetOp[]): DataSetLookup;
//# sourceMappingURL=lookup.d.ts.map