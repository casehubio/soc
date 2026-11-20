import { type TemplateResult } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { MetricProps } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesMetric extends PagesElement<MetricProps> {
    private _renderGen;
    private _asyncValue;
    private _lastAsyncRaw;
    private _lastAsyncExpr;
    static styles: import("lit").CSSResult;
    protected renderContent(props: MetricProps, dataset: TypedDataSet): TemplateResult;
    private renderWithValue;
    private _renderTrend;
    private _renderSparkline;
    private renderCard;
    private renderCard2;
    private renderPlainText;
    private renderQuota;
}
//# sourceMappingURL=PagesMetric.d.ts.map