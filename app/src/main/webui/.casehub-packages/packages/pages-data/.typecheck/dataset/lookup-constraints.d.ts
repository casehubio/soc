import { ColumnType } from "./types.js";
import type { Column } from "./types.js";
import type { DataSetLookup } from "./lookup.js";
export interface DataSetLookupConstraints {
    readonly filterAllowed: boolean;
    readonly groupAllowed: boolean;
    readonly groupRequired: boolean;
    readonly maxGroups?: number;
    readonly minColumns?: number;
    readonly maxColumns?: number;
    readonly columnTypes?: readonly (readonly ColumnType[])[];
    readonly uniqueColumnIds: boolean;
    readonly extraColumnsAllowed: boolean;
    readonly extraColumnsType?: ColumnType;
}
export declare const DEFAULT_CONSTRAINTS: DataSetLookupConstraints;
export type LookupViolationCode = "FILTER_NOT_ALLOWED" | "GROUP_NOT_ALLOWED" | "GROUP_REQUIRED" | "TOO_MANY_GROUPS" | "TOO_FEW_COLUMNS" | "TOO_MANY_COLUMNS" | "COLUMN_TYPE_MISMATCH" | "DUPLICATE_COLUMN_IDS" | "EXTRA_COLUMNS_NOT_ALLOWED" | "EXTRA_COLUMN_TYPE_MISMATCH";
export interface LookupViolation {
    readonly code: LookupViolationCode;
    readonly message: string;
    readonly position?: number;
}
export declare function validateLookup(lookup: DataSetLookup, constraints: DataSetLookupConstraints, columns?: readonly Column[]): readonly LookupViolation[];
//# sourceMappingURL=lookup-constraints.d.ts.map