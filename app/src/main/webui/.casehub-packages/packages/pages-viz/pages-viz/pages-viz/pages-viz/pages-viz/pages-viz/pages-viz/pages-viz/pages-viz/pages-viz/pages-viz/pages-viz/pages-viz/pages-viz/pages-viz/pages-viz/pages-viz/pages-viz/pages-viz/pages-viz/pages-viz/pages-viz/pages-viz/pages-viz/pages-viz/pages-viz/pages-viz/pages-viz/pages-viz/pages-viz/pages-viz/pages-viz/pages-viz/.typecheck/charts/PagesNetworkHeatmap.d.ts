import { type TemplateResult } from "lit";
import type { NetworkHeatmapProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesNetworkHeatmap extends PagesElement<NetworkHeatmapProps> {
    static styles: import("lit").CSSResult;
    private _containerRef;
    private _heatmap;
    connectedCallback(): void;
    render(): TemplateResult;
    protected renderContent(props: NetworkHeatmapProps, dataset: TypedDataSet): TemplateResult;
    updated(): void;
    private _updateHeatmap;
    private _extractGraph;
    private _normalizePositions;
    private _applySizing;
    onResize(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=PagesNetworkHeatmap.d.ts.map