import type { DataSetId, TypedDataSet } from "./types.js";
import type { DataSetLookup } from "./lookup.js";
import type { DataSetEvent } from "./events.js";
export interface DataSetManagerOptions {
    readonly onChanged?: (id: DataSetId, dataset: TypedDataSet) => void;
}
export interface LookupOptions {
    readonly rowOffset?: number;
    readonly rowCount?: number;
    readonly referenceDate?: Date;
}
export interface LookupResult {
    readonly dataset: TypedDataSet;
    readonly totalRows: number;
}
export interface DataSetManager {
    get(id: DataSetId): TypedDataSet | undefined;
    remove(id: DataSetId): boolean;
    has(id: DataSetId): boolean;
    apply(id: DataSetId, event: DataSetEvent): void;
    lookup(query: DataSetLookup, options?: LookupOptions): LookupResult;
    age(id: DataSetId): number | undefined;
}
export declare function createDataSetManager(options?: DataSetManagerOptions): DataSetManager;
//# sourceMappingURL=manager.d.ts.map