import { LitElement, type TemplateResult } from "lit";
import type { DataSetLookup, SortColumn, TypedDataSet } from "@casehubio/pages-data";
import { DataSourceController } from "@casehubio/pages-component";
import type { VizComponentProps } from "./types.js";
export interface PagesDataRequestDetail {
    readonly element: PagesElement<VizComponentProps>;
    readonly lookup: DataSetLookup;
}
export declare abstract class PagesElement<P extends VizComponentProps> extends LitElement {
    readonly controller: DataSourceController;
    props: P | undefined;
    private _theme;
    private _batchUpdate;
    private _dataRequested;
    private _refreshTimer;
    private _resizeObserver;
    private _prevProps;
    get loading(): boolean;
    set loading(v: boolean);
    get dataSet(): TypedDataSet | undefined;
    set dataSet(value: TypedDataSet | undefined);
    get totalRows(): number;
    set totalRows(value: number);
    get theme(): string;
    set theme(value: string);
    get error(): string;
    set error(value: string);
    get activeSort(): SortColumn | undefined;
    set activeSort(value: SortColumn | undefined);
    get activePage(): number | undefined;
    set activePage(value: number | undefined);
    connectedCallback(): void;
    disconnectedCallback(): void;
    willUpdate(): void;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
    protected renderLoading(): TemplateResult;
    protected renderError(message: string): TemplateResult;
    private requestDataIfNeeded;
    private startRefreshTimer;
    private stopRefreshTimer;
    private startResizeObserver;
    private stopResizeObserver;
    private _handleRetry;
    protected onResize(): void;
    protected abstract renderContent(props: P, dataset: TypedDataSet): TemplateResult;
}
//# sourceMappingURL=PagesElement.d.ts.map