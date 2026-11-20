import type { DataSetOp } from "@casehubio/pages-data";
export type FilterState = Map<string, Map<string | undefined, Map<string, string[]>>>;
export declare function createFilterState(): FilterState;
export declare function getActiveFilterOps(filterState: FilterState, pagePath: string, group: string | undefined): DataSetOp[];
export declare function updateFilter(filterState: FilterState, pagePath: string, group: string | undefined, columnId: string, values: string[], reset: boolean): void;
export declare function deriveActiveFilters(filterState: FilterState, pagePath: string): Readonly<Record<string, readonly string[]>>;
export declare function collectAncestorFilterOps(filterState: FilterState, pagePath: string, group: string | undefined): DataSetOp[];
export declare function clearPageFilters(filterState: FilterState, pagePath: string): void;
//# sourceMappingURL=cross-filter.d.ts.map