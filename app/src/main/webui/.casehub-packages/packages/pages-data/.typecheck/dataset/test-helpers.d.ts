import type { DataSetOp } from "./ops.js";
import type { GroupOp, ResultColumn } from "./group.js";
import type { FilterOp } from "./filter.js";
import type { SortOp } from "./sort.js";
export declare function expectGroupOp(op: DataSetOp): GroupOp;
export declare function expectFilterOp(op: DataSetOp): FilterOp;
export declare function expectSortOp(op: DataSetOp): SortOp;
export declare function expectAggregateColumn(col: ResultColumn): ResultColumn & {
    kind: "aggregate";
};
//# sourceMappingURL=test-helpers.d.ts.map