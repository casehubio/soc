import type { TypedRow } from '@casehubio/pages-data';
export interface TreeRow {
    readonly row: TypedRow;
    readonly depth: number;
    readonly hasChildren: boolean;
    readonly expanded: boolean;
}
export declare function flattenTree(rows: readonly TypedRow[], getChildren: (row: TypedRow) => readonly TypedRow[], expandedIds: ReadonlySet<string>, getRowId: (row: TypedRow) => string, depth?: number): TreeRow[];
//# sourceMappingURL=tree.d.ts.map