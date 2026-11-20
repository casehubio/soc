import type { CellValue, Column, ColumnId, DataSet, TypedDataSet, TypedRow } from "./types.js";
import { ColumnType } from "./types.js";
export declare function createTypedRow(cells: readonly CellValue[], columns: readonly Column[]): TypedRow;
export declare function toTypedDataSet(ds: DataSet): TypedDataSet;
export declare function toWireDataSet(ds: TypedDataSet): DataSet;
export declare function fromRows<R>(rows: readonly R[], columns: readonly {
    readonly id: ColumnId;
    readonly name?: string;
    readonly type: ColumnType;
    readonly getValue: (row: R) => unknown;
}[]): TypedDataSet;
//# sourceMappingURL=conversion.d.ts.map