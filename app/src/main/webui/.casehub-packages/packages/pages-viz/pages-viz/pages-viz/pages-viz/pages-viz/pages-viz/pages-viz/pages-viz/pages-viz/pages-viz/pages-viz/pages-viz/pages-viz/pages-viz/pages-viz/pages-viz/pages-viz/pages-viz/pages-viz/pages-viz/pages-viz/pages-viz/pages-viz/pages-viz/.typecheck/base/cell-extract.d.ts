import type { CellValue, Column, ColumnSettings } from "@casehubio/pages-data";
export declare function cellToRaw(cell: CellValue): string | number | Date | null;
export declare function resolveColumnName(column: Column, propsColumns?: readonly ColumnSettings[]): string;
export declare function applyCellExpression(raw: string | number | Date | null, expression: string): Promise<string | number | Date | null>;
export declare function resolveColumnExpression(columnId: string, propsColumns?: readonly ColumnSettings[]): string | undefined;
//# sourceMappingURL=cell-extract.d.ts.map