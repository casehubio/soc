import type { DataSource, DataSourceBinding, SourceConnector } from "@casehubio/pages-data";
import type { SortColumn } from "@casehubio/pages-data";
import type { DataSetId, TypedDataSet } from "@casehubio/pages-data";
import type { ExternalColumnDef } from "@casehubio/pages-data";
import type { SourceFactory } from "@casehubio/pages-data";
import type { VizTarget } from "../model/hosting.js";
export interface DataSourceControllerOptions {
    onChange?: () => void;
    onRefresh?: () => void;
    dataSetId?: DataSetId;
    sourceFactory?: SourceFactory;
    columns?: readonly ExternalColumnDef[];
    dataPath?: string;
    totalPath?: string;
    refreshTime?: string;
    cacheTtl?: string;
}
export declare class DataSourceController implements VizTarget {
    private _loading;
    private _dataSet;
    private _error;
    private _totalRows;
    private _activeSort;
    private _activePage;
    private _endpoint;
    private _connector;
    private readonly _dataSetId;
    readonly onChange: (() => void) | undefined;
    private readonly _onRefresh;
    private readonly _sourceFactory;
    private readonly _columns;
    private readonly _dataPath;
    private readonly _totalPath;
    private readonly _refreshTime;
    private readonly _cacheTtl;
    constructor(options?: DataSourceControllerOptions);
    get loading(): boolean;
    set loading(v: boolean);
    get dataSet(): TypedDataSet | undefined;
    set dataSet(v: TypedDataSet | undefined);
    get error(): string;
    set error(v: string);
    get totalRows(): number;
    set totalRows(v: number);
    get activeSort(): SortColumn | undefined;
    set activeSort(v: SortColumn | undefined);
    get activePage(): number | undefined;
    set activePage(v: number | undefined);
    get dataSetId(): DataSetId;
    get endpoint(): string | undefined;
    set endpoint(url: string | undefined);
    get connector(): SourceConnector | undefined;
    set connector(c: SourceConnector | undefined);
    createSource(): DataSource | undefined;
    toBinding(): DataSourceBinding | undefined;
    refresh(): void;
    dispose(): void;
}
//# sourceMappingURL=data-source-controller.d.ts.map