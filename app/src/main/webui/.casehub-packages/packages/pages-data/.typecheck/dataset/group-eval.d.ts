import type { CellValue, ColumnId, TypedDataSet } from "./types.js";
import type { Aggregation, GroupOp, IntervalList } from "./group.js";
import type { FixedCalendarUnit } from "./group.js";
import type { Month, DayOfWeek } from "./date-interval.js";
import type { DateIntervalType } from "./date-interval.js";
export declare function computeAggregation(fn: Aggregation, values: readonly CellValue[]): CellValue;
export declare function cellValueToString(val: CellValue): string | null;
export declare function buildDistinctIntervals(ds: TypedDataSet, sourceId: ColumnId): IntervalList;
export declare function buildFixedCalendarIntervals(ds: TypedDataSet, sourceId: ColumnId, unit: FixedCalendarUnit, opts?: {
    firstMonthOfYear?: Month;
    firstDayOfWeek?: DayOfWeek;
}): IntervalList;
export declare function buildDynamicDateIntervals(ds: TypedDataSet, sourceId: ColumnId, maxIntervals: number, opts?: {
    preferredUnit?: DateIntervalType;
    firstMonthOfYear?: Month;
}): IntervalList;
export declare function applyGroup(ds: TypedDataSet, op: GroupOp): TypedDataSet;
export declare function applyGroupSequence(ds: TypedDataSet, ops: readonly GroupOp[]): TypedDataSet;
export declare function buildDynamicNumberIntervals(ds: TypedDataSet, sourceId: ColumnId, maxIntervals: number): IntervalList;
//# sourceMappingURL=group-eval.d.ts.map