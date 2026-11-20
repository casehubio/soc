import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { DataSourceMixin } from '@casehubio/pages-component';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { fromRows } from '@casehubio/pages-data';
import type { TypedDataSet, TypedRow, ColumnId } from '@casehubio/pages-data';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import { EMPTY_FILTER_STATE, type FilterState } from '@casehubio/pages-filter-bar';
import type { DataSink } from '@casehubio/pages-data';
import '@casehubio/pages-table';
import '@casehubio/pages-filter-bar';

type ColDef = Parameters<typeof fromRows>[1][number];

export class PagesEventTrail extends DataSourceMixin(LiveRegionMixin(LitElement)) {
  @property({ type: Array }) data?: unknown[];
  @property({ type: Array }) columnDefs: readonly ColDef[] = [];
  @property({ type: Array }) columnConfig?: TableColumnConfig[];
  @property({ type: Object }) columnRenderers?: ReadonlyMap<ColumnId, ColumnRenderer>;
  @property({ type: String }) chipField?: ColumnId;
  @property({ type: Array }) chipValues?: string[];
  @property({ type: String }) entityField?: ColumnId;
  @property({ type: String }) entityLabel?: string;
  @property({ type: Boolean }) showDateRange = false;
  @property({ type: Object }) getRowDetail?: (row: TypedRow, rawEntry?: unknown) => TemplateResult | undefined;
  @property({ type: Object }) getRowKey?: (row: TypedRow) => string;
  @property({ type: String }) recordsPath?: string;
  @property({ type: Boolean }) csvExport = false;

  @state() private _rawEntries: unknown[] = [];
  @state() private _filterState: FilterState = EMPTY_FILTER_STATE;
  @state() private _filteredDataSet?: TypedDataSet;
  @state() private _expandedKey: string | null = null;
  @state() private _rawEntryByRow = new WeakMap<TypedRow, unknown>();

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Event trail');
  }

  override createSourceFactory() {
    return (url: string) => {
      let abort: AbortController | undefined;
      return {
        connect: (sink: DataSink) => {
          abort = new AbortController();
          const signal = abort.signal;
          globalThis.fetch(url, { signal })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((body: unknown) => {
              if (signal.aborted) return;
              const entries = (this.recordsPath
                ? (body as Record<string, unknown>)[this.recordsPath]
                : body) as unknown[];
              this._rawEntries = entries;
              const dataset = fromRows(entries, this.columnDefs);
              sink.apply({ type: 'snapshot', dataset });
              this._applyFilters();
              this.dispatchEvent(new CustomEvent('data-loaded', {
                bubbles: true, composed: true,
                detail: { entries },
              }));
            })
            .catch(err => {
              if (signal.aborted || err.name === 'AbortError') return;
              sink.error({ message: err instanceof Error ? err.message : String(err), permanent: true });
            });
        },
        disconnect: () => { abort?.abort(); abort = undefined; },
      };
    };
  }

  override resolveEndpoint(): string | undefined {
    if (this.data) return undefined;
    if (!this.endpoint) return undefined;
    const url = new URL(this.endpoint, globalThis.location?.origin ?? 'http://localhost');
    if (this._filterState.dateFrom) url.searchParams.set('from', this._filterState.dateFrom);
    if (this._filterState.dateTo) url.searchParams.set('to', this._filterState.dateTo);
    return url.toString();
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('data') && this.data) {
      this._rawEntries = this.data;
      this.dataSet = fromRows(this.data, this.columnDefs);
      this._applyFilters();
      this.dispatchEvent(new CustomEvent('data-loaded', {
        bubbles: true, composed: true,
        detail: { entries: this.data },
      }));
    }
  }

  override configure(props: Record<string, unknown>): void {
    if (props.data !== undefined) this.data = props.data as unknown[];
    if (props.columnDefs !== undefined) this.columnDefs = props.columnDefs as ColDef[];
    if (props.columnConfig !== undefined) this.columnConfig = props.columnConfig as TableColumnConfig[];
    if (props.chipField !== undefined) this.chipField = props.chipField as ColumnId;
    if (props.chipValues !== undefined) this.chipValues = props.chipValues as string[];
    if (props.entityField !== undefined) this.entityField = props.entityField as ColumnId;
    if (props.entityLabel !== undefined) this.entityLabel = props.entityLabel as string;
    if (props.showDateRange !== undefined) this.showDateRange = props.showDateRange as boolean;
    if (props.getRowDetail !== undefined) this.getRowDetail = props.getRowDetail as (row: TypedRow, rawEntry?: unknown) => TemplateResult | undefined;
    if (props.getRowKey !== undefined) this.getRowKey = props.getRowKey as (row: TypedRow) => string;
    if (props.columnRenderers !== undefined) this.columnRenderers = props.columnRenderers as ReadonlyMap<ColumnId, ColumnRenderer>;
    if (props.recordsPath !== undefined) this.recordsPath = props.recordsPath as string;
    if (props.csvExport !== undefined) this.csvExport = props.csvExport as boolean;
    super.configure(props);
  }

  private _handleFilterChange(e: CustomEvent<FilterState>): void {
    const prev = this._filterState;
    this._filterState = e.detail;
    if (prev.dateFrom !== e.detail.dateFrom || prev.dateTo !== e.detail.dateTo) {
      this.syncEndpoint();
    }
    this._applyFilters();
  }

  private _applyFilters(): void {
    const chipGetter = this.chipField
      ? this.columnDefs.find(c => c.id === this.chipField)?.getValue
      : undefined;
    const entityGetter = this.entityField
      ? this.columnDefs.find(c => c.id === this.entityField)?.getValue
      : undefined;

    const filtered = this._rawEntries.filter(entry => {
      if (this._filterState.selectedChips.length > 0 && chipGetter) {
        if (!this._filterState.selectedChips.includes(String(chipGetter(entry)))) return false;
      }
      if (this._filterState.selectedEntity && entityGetter) {
        if (String(entityGetter(entry)) !== this._filterState.selectedEntity) return false;
      }
      return true;
    });
    this._filteredDataSet = fromRows(filtered, this.columnDefs);
    this._rawEntryByRow = new WeakMap();
    for (let i = 0; i < this._filteredDataSet.rows.length; i++) {
      const row = this._filteredDataSet.rows[i];
      if (row) this._rawEntryByRow.set(row, filtered[i]);
    }
  }

  _wrapGetRowDetail(): ((row: TypedRow) => TemplateResult | undefined) | undefined {
    if (!this.getRowDetail) return undefined;
    return (row: TypedRow) => this.getRowDetail!(row, this._rawEntryByRow.get(row));
  }

  private _handleDetailChange(e: CustomEvent): void {
    const { key, expanded } = e.detail as { key: string; expanded: boolean };
    this._expandedKey = expanded ? key : null;
    this.dispatchEvent(new CustomEvent('detail-change', {
      bubbles: true,
      composed: true,
      detail: e.detail,
    }));
  }

  static override styles = css`
    :host { display: block; }
    .loading {
      padding: var(--pages-space-4, 16px);
      color: var(--pages-neutral-9, #999);
      font-family: var(--pages-font-family, system-ui);
    }
    .error {
      padding: var(--pages-space-4, 16px);
      color: var(--pages-danger-11, #b91c1c);
      font-family: var(--pages-font-family, system-ui);
    }
    .error button {
      margin-top: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) var(--pages-space-3, 12px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      background: var(--pages-neutral-1, #fff);
      cursor: pointer;
      font-family: var(--pages-font-family, system-ui);
    }
    pages-filter-bar { margin-bottom: var(--pages-space-3, 12px); }
  `;

  override render() {
    if (this.loading) return html`<div class="loading" aria-busy="true">Loading...</div>`;
    if (this.error) return html`<div class="error" role="alert">
      <p>${this.error}</p>
      <button @click=${() => { this.syncEndpoint(); }}>Retry</button>
    </div>`;

    const hasFilters = this.chipField || this.chipValues || this.entityField || this.showDateRange;
    const activeDataSet = this._filteredDataSet ?? this.dataSet;

    return html`
      ${hasFilters ? html`
        <pages-filter-bar
          .dataSet=${this.dataSet}
          .chipField=${this.chipField}
          .chipValues=${this.chipValues}
          .entityField=${this.entityField}
          .entityLabel=${this.entityLabel ?? ''}
          ?showDateRange=${this.showDateRange}
          @filter-bar-change=${this._handleFilterChange}
        ></pages-filter-bar>
      ` : nothing}
      <pages-table
        .dataSet=${activeDataSet}
        .columnConfig=${this.columnConfig}
        .columnRenderers=${this.columnRenderers}
        .getRowKey=${this.getRowKey}
        .getRowDetail=${this._wrapGetRowDetail()}
        detailMode="single"
        .expandedDetailKeys=${this._expandedKey ? [this._expandedKey] : []}
        client-sort
        client-filter
        ?csvExport=${this.csvExport}
        @detail-change=${this._handleDetailChange}
      ></pages-table>
    `;
  }
}

if (!customElements.get('pages-event-trail')) {
  customElements.define('pages-event-trail', PagesEventTrail);
}
