import { type TemplateResult } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { GridTableProps } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesGridTable extends PagesElement<GridTableProps> {
    static styles: import("lit").CSSResult;
    private _transpose;
    protected renderContent(props: GridTableProps, dataset: TypedDataSet): TemplateResult;
    private _renderCell;
}
//# sourceMappingURL=PagesGridTable.d.ts.map