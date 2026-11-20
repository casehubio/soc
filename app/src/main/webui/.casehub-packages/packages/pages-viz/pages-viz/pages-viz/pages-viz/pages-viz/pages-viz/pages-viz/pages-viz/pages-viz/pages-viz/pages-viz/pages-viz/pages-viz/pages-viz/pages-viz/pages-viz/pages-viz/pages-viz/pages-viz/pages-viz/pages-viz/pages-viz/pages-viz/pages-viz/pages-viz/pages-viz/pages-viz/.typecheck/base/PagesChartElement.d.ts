import { type TemplateResult, type PropertyValues } from "lit";
import { PagesElement } from "./PagesElement.js";
import type { VizComponentProps } from "./types.js";
import type { TypedDataSet, Column } from "@casehubio/pages-data";
import type { ChartSettingsBase } from "@casehubio/pages-component";
export declare abstract class PagesChartElement<P extends VizComponentProps & ChartSettingsBase> extends PagesElement<P> {
    private _chartRef;
    private _chart;
    private _chartContainer;
    private _currentTheme;
    private _selectedValue;
    private _selectedDataIndex;
    private _renderGen;
    protected renderContent(_props: P, _dataset: TypedDataSet): TemplateResult;
    render(): TemplateResult;
    updated(changed: PropertyValues): void;
    get dataSet(): TypedDataSet | undefined;
    set dataSet(value: TypedDataSet | undefined);
    protected resolveFilterColumn(): Column | undefined;
    private applySizing;
    abstract buildOption(props: P, dataset: TypedDataSet): Record<string, unknown> | Promise<Record<string, unknown>>;
    private ensureChart;
    private registerClickHandler;
    private syncHighlight;
    onResize(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=PagesChartElement.d.ts.map