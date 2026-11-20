import { type TemplateResult } from "lit";
import type { DensityHeatmapProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesDensityHeatmap extends PagesElement<DensityHeatmapProps> {
    static styles: import("lit").CSSResult;
    private _containerRef;
    private _heatmap;
    connectedCallback(): void;
    render(): TemplateResult;
    protected renderContent(_props: DensityHeatmapProps, _dataset: TypedDataSet): TemplateResult;
    updated(): void;
    private _updateHeatmap;
    private applySizing;
    private createInstance;
    private extractAndNormalize;
    onResize(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=PagesDensityHeatmap.d.ts.map