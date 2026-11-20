import { type TemplateResult } from "lit";
import { PagesContentElement } from "../base/PagesContentElement.js";
interface LegendEntry {
    readonly label: string;
    readonly color: string;
}
export interface LegendProps {
    readonly entries: readonly LegendEntry[];
    readonly layout?: "linear" | "horizontal" | "vertical" | "grid";
    readonly swatchShape?: "square" | "circle";
}
export declare class PagesLegend extends PagesContentElement<LegendProps> {
    static styles: import("lit").CSSResult;
    protected renderContent(props: LegendProps): TemplateResult;
}
export {};
//# sourceMappingURL=PagesLegend.d.ts.map