import { type TemplateResult } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { BadgeProps } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesBadge extends PagesElement<BadgeProps> {
    private _colorCache;
    static styles: import("lit").CSSResult;
    protected renderContent(props: BadgeProps, dataset: TypedDataSet): TemplateResult;
    private resolveTargetColumn;
    private resolveColor;
}
//# sourceMappingURL=PagesBadge.d.ts.map