import type { ColumnId, TypedRow } from '@casehubio/pages-data';
import type { TableColumnConfig, SortDirection, SortEntry } from './types.js';
type RowComparator = (a: TypedRow, b: TypedRow) => number;
export declare function createComparator(columnId: ColumnId, direction: SortDirection, config?: TableColumnConfig): RowComparator;
export declare function createMultiComparator(sortStack: readonly SortEntry[], configs: readonly TableColumnConfig[]): RowComparator;
export {};
//# sourceMappingURL=sort.d.ts.map