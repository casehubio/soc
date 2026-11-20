import type {DataSource, DataSourceBinding, SourceConnector} from "@casehubio/pages-data";
import type {SortColumn} from "@casehubio/pages-data";
import type {DataSetId, TypedDataSet} from "@casehubio/pages-data";
import {dataSetId} from "@casehubio/pages-data";
import type {ExternalColumnDef} from "@casehubio/pages-data";
import type {SourceFactory} from "@casehubio/pages-data";
import type {VizTarget} from "../model/hosting.js";

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

export class DataSourceController implements VizTarget {
  private _loading = false;
  private _dataSet: TypedDataSet | undefined = undefined;
  private _error = "";

  private _totalRows = -1;
  private _activeSort: SortColumn | undefined;
  private _activePage: number | undefined;

  private _endpoint: string | undefined;
  private _connector: SourceConnector | undefined;
  private readonly _dataSetId: DataSetId;

  readonly onChange: (() => void) | undefined;
  private readonly _onRefresh: (() => void) | undefined;
  private readonly _sourceFactory: SourceFactory | undefined;
  private readonly _columns: readonly ExternalColumnDef[] | undefined;
  private readonly _dataPath: string | undefined;
  private readonly _totalPath: string | undefined;
  private readonly _refreshTime: string | undefined;
  private readonly _cacheTtl: string | undefined;

  constructor(options?: DataSourceControllerOptions) {
    this.onChange = options?.onChange;
    this._onRefresh = options?.onRefresh;
    this._sourceFactory = options?.sourceFactory;
    this._dataSetId = options?.dataSetId ?? dataSetId("ds-controller");
    this._columns = options?.columns;
    this._dataPath = options?.dataPath;
    this._totalPath = options?.totalPath;
    this._refreshTime = options?.refreshTime;
    this._cacheTtl = options?.cacheTtl;
  }

  get loading(): boolean { return this._loading; }
  set loading(v: boolean) {
    const hadError = this._error !== "";
    if (v) this._error = "";
    if (v === this._loading && !hadError) return;
    this._loading = v;
    this.onChange?.();
  }

  get dataSet(): TypedDataSet | undefined { return this._dataSet; }
  set dataSet(v: TypedDataSet | undefined) {
    this._loading = false;
    this._error = "";
    this._dataSet = v;
    this.onChange?.();
  }

  get error(): string { return this._error; }
  set error(v: string) {
    this._loading = false;
    this._dataSet = undefined;
    this._error = v;
    this.onChange?.();
  }

  get totalRows(): number { return this._totalRows; }
  set totalRows(v: number) { this._totalRows = v; }

  get activeSort(): SortColumn | undefined { return this._activeSort; }
  set activeSort(v: SortColumn | undefined) { this._activeSort = v; }

  get activePage(): number | undefined { return this._activePage; }
  set activePage(v: number | undefined) { this._activePage = v; }

  get dataSetId(): DataSetId { return this._dataSetId; }

  get endpoint(): string | undefined { return this._endpoint; }
  set endpoint(url: string | undefined) {
    if (url === this._endpoint) return;
    this._endpoint = url;
    if (this._connector) {
      if (url) {
        const source = this.createSource();
        if (source) this._connector.replace(source);
      } else {
        this._connector.disconnect();
      }
    }
  }

  get connector(): SourceConnector | undefined { return this._connector; }
  set connector(c: SourceConnector | undefined) {
    this._connector?.disconnect();
    this._connector = c;
    if (c && this._endpoint) {
      const source = this.createSource();
      if (source) c.connect(source);
    }
  }

  createSource(): DataSource | undefined {
    if (!this._endpoint) return undefined;
    if (this._sourceFactory) {
      return this._sourceFactory(this._endpoint, this._dataSetId, {
        columns: this._columns,
        dataPath: this._dataPath,
        totalPath: this._totalPath,
      });
    }
    return { connect() {}, disconnect() {} };
  }

  toBinding(): DataSourceBinding | undefined {
    const source = this.createSource();
    if (!source) return undefined;
    return {
      id: this._dataSetId,
      source,
      ...(this._refreshTime !== undefined && { refreshTime: this._refreshTime }),
      ...(this._cacheTtl !== undefined && { cacheTtl: this._cacheTtl }),
    };
  }

  refresh(): void {
    if (this._connector?.connected) {
      this._connector.refresh();
      return;
    }
    if (this._onRefresh && this._dataSet !== undefined) {
      this._onRefresh();
    }
  }

  dispose(): void {
    this._connector?.dispose();
    this._connector = undefined;
    this._endpoint = undefined;
  }
}
