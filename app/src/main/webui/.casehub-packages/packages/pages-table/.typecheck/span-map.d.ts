import type { TypedRow, Column } from '@casehubio/pages-data';
import type { TableColumnConfig } from './types.js';
export interface CellSpan {
    readonly colSpan: number;
    readonly rowSpan: number;
}
export interface SuppressedCell {
    readonly originRow: number;
    readonly originCol: string;
}
export type SpanEntry = CellSpan | SuppressedCell;
export type SpanMap = Map<number, Map<string, SpanEntry>>;
export declare function isSuppressed(entry: SpanEntry): entry is SuppressedCell;
export declare function isOrigin(entry: SpanEntry): entry is CellSpan;
export declare function computeSpanMap(rows: readonly TypedRow[], _columns: readonly Column[], config: readonly TableColumnConfig[], visibleColIds: Set<string>): SpanMap;
//# sourceMappingURL=span-map.d.ts.map