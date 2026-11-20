import type { FilterOp, ResolvedFilterOp } from "./filter.js";
import type { GroupOp } from "./group.js";
import type { SortOp } from "./sort.js";
import type { TypedDataSet } from "./types.js";
export type DataSetOp = FilterOp | GroupOp | SortOp;
export type ResolvedDataSetOp = ResolvedFilterOp | GroupOp | SortOp;
export interface ApplyOpsOptions {
    readonly referenceDate?: Date;
}
export declare function validateOpOrder(ops: readonly DataSetOp[]): void;
export declare function applyOps(ds: TypedDataSet, ops: readonly ResolvedDataSetOp[], options?: ApplyOpsOptions): TypedDataSet;
//# sourceMappingURL=ops.d.ts.map