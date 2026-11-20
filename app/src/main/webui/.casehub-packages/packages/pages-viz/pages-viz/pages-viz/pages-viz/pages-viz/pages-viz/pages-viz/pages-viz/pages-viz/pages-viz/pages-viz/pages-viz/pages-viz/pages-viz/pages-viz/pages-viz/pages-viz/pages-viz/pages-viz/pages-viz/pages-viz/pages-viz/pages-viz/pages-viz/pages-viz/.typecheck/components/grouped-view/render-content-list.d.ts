import type { TypedDataSet, ColumnId } from "@casehubio/pages-data";
import type { ColumnRenderer } from "@casehubio/pages-component";
import type { GroupBoundary } from "./group-extraction.js";
export declare function renderContentList(dataset: TypedDataSet, boundary: GroupBoundary, contentColumns: readonly ColumnId[], colWidthsCss: string, renderers?: ReadonlyMap<ColumnId, ColumnRenderer>): HTMLElement;
//# sourceMappingURL=render-content-list.d.ts.map