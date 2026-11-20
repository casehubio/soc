import type { TypedDataSet, ColumnId } from "./dataset/types.js";
import type { GroupingKey } from "./dataset/group.js";
export interface GroupNode {
    readonly name: string;
    readonly depth: number;
    readonly startRow: number;
    readonly rowCount: number;
    readonly children: readonly GroupNode[];
    readonly aggregates?: ReadonlyMap<ColumnId, unknown>;
}
export interface GroupBoundary {
    readonly name: string;
    readonly startRow: number;
    readonly rowCount: number;
    readonly aggregates: ReadonlyMap<ColumnId, unknown>;
}
export declare function extractGroupBoundaries(dataset: TypedDataSet, keyColumnId: ColumnId, aggregateColumnIds: readonly ColumnId[]): readonly GroupBoundary[];
export declare function extractGroupTree(dataset: TypedDataSet, keys: readonly GroupingKey[], aggregations: readonly {
    column: ColumnId;
    fn: {
        fn: string;
    };
}[]): readonly GroupNode[];
//# sourceMappingURL=group-extraction.d.ts.map