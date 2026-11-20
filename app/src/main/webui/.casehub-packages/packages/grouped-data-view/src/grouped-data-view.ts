import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DataSourceMixin } from '@casehubio/pages-component';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ColumnId, TypedDataSet } from '@casehubio/pages-data';
import type { GroupingKey } from '@casehubio/pages-data';
import type { TableColumnConfig, ColumnRenderer, SelectionMode } from '@casehubio/pages-table';
import type { RowStyleRule } from '@casehubio/pages-component';
import type { GroupStyleConfig } from './types.js';
import { GroupedDataViewTopics } from './types.js';

interface PagesGroupedViewHost extends HTMLElement {
  props: Record<string, unknown> | undefined;
  dataSet: TypedDataSet | undefined;
  loading: boolean;
  error: string;
  setColumnRenderers(v: ReadonlyMap<ColumnId, ColumnRenderer> | undefined): void;
  setGetRowKey(v: ((row: import('@casehubio/pages-data').TypedRow) => string) | undefined): void;
  setGetRowClass(v: ((row: import('@casehubio/pages-data').TypedRow) => string) | undefined): void;
}

export interface GroupedDataViewProps {
  ariaLabel: string | null;
  groupBy: string;
  groupOrder?: string[];
  groupConfig?: Map<string, GroupStyleConfig>;
  groupStyle?: (groupName: string) => GroupStyleConfig | undefined;
  columnConfig?: readonly TableColumnConfig[];
  columnRenderers?: ReadonlyMap<ColumnId, ColumnRenderer>;
  rowStyle?: readonly RowStyleRule[];
  selection?: SelectionMode;
  preset: 'sectioned' | 'spreadsheet' | 'list';
  defaultExpanded: boolean;
  sortable: boolean;
}

@customElement('agency-grouped-data-view')
export class GroupedDataView extends DataSourceMixin(LitElement) {
  @property({ type: String, reflect: true, attribute: 'aria-label' }) override ariaLabel: string | null = 'Grouped data';
  @property({ type: String, attribute: 'group-by' }) groupBy = '';
  @property({ attribute: false }) groupOrder?: string[];
  @property({ attribute: false }) groupConfig?: Map<string, GroupStyleConfig>;
  @property({ attribute: false }) groupStyle?: (groupName: string) => GroupStyleConfig | undefined;
  @property({ type: String }) preset: 'sectioned' | 'spreadsheet' | 'list' = 'sectioned';
  @property({ type: Boolean, attribute: 'default-expanded' }) defaultExpanded = true;
  @property({ attribute: false }) columnConfig?: readonly TableColumnConfig[];
  @property({ attribute: false }) columnRenderers?: ReadonlyMap<ColumnId, ColumnRenderer>;
  @property({ attribute: false }) rowStyle?: readonly RowStyleRule[];
  @property({ type: String }) selection?: SelectionMode;
  @property({ type: Boolean }) sortable = false;

  private _groupedView: PagesGroupedViewHost | null = null;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .empty { color: var(--pages-neutral-9, #888); font-style: italic; padding: var(--pages-space-4, 1rem); }
  `;

  _toGroupingKey(columnId: string): GroupingKey {
    return {
      sourceId: columnId as ColumnId,
      columnId: columnId as ColumnId,
      strategy: { mode: 'distinct' },
      maxIntervals: 100,
      emptyIntervals: false,
      ascendingOrder: true,
    };
  }

  _prepareDataSet(
    ds: TypedDataSet,
    keyColumn: string,
    groupOrder?: string[],
  ): TypedDataSet {
    const colId = keyColumn as ColumnId;

    if (groupOrder) {
      const orderIndex = new Map(groupOrder.map((name, i) => [name, i]));
      const sorted = [...ds.rows].sort((a, b) => {
        const aCell = a.cell(colId);
        const bCell = b.cell(colId);
        const aName = aCell.type !== 'NULL' ? String(aCell.value) : '';
        const bName = bCell.type !== 'NULL' ? String(bCell.value) : '';
        const aIdx = orderIndex.get(aName) ?? groupOrder.length;
        const bIdx = orderIndex.get(bName) ?? groupOrder.length;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return aName < bName ? -1 : aName > bName ? 1 : 0;
      });
      return { columns: ds.columns, rows: sorted };
    }

    const sorted = [...ds.rows].sort((a, b) => {
      const aCell = a.cell(colId);
      const bCell = b.cell(colId);
      const aName = aCell.type !== 'NULL' ? String(aCell.value) : '';
      const bName = bCell.type !== 'NULL' ? String(bCell.value) : '';
      return aName < bName ? -1 : aName > bName ? 1 : 0;
    });
    return { columns: ds.columns, rows: sorted };
  }

  private _ensureGroupedView(): PagesGroupedViewHost {
    if (!this._groupedView) {
      this._groupedView = document.createElement('pages-grouped-view') as PagesGroupedViewHost;
      this._groupedView.addEventListener('pages-event', (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail.topic === 'group-toggle') {
          e.stopPropagation();
          emitPagesEvent(this, GroupedDataViewTopics.GROUP_TOGGLE, detail.payload);
        }
      });
      this._groupedView.addEventListener('row-activate', (e: Event) => {
        e.stopPropagation();
        emitPagesEvent(this, GroupedDataViewTopics.ROW_ACTIVATED, (e as CustomEvent).detail);
      });
    }
    return this._groupedView;
  }

  override updated(changed: PropertyValues): void {
    super.updated(changed);

    if (!this.groupBy || !this.dataSet) {
      if (this._groupedView?.parentNode) {
        this._groupedView.remove();
      }
      return;
    }

    const gv = this._ensureGroupedView();
    const preparedDataSet = this._prepareDataSet(this.dataSet, this.groupBy, this.groupOrder);

    gv.props = {
      groupBy: this._toGroupingKey(this.groupBy),
      preset: this.preset,
      defaultExpanded: this.defaultExpanded,
      ...(this.columnConfig ? { columnConfig: this.columnConfig } : {}),
      ...(this.rowStyle ? { rowStyle: this.rowStyle } : {}),
      ...(this.selection ? { selection: this.selection } : {}),
      ...(this.sortable ? { sortable: true } : {}),
    };

    gv.dataSet = preparedDataSet;

    if (this.columnRenderers) {
      gv.setColumnRenderers(this.columnRenderers);
    }

    const container = this.shadowRoot!.querySelector('.container');
    if (container && !gv.parentNode) {
      container.appendChild(gv);
    }
  }

  override configure(props: Partial<GroupedDataViewProps>): void {
    if (props.groupBy !== undefined) this.groupBy = props.groupBy;
    if (props.groupOrder !== undefined) this.groupOrder = props.groupOrder;
    if (props.groupConfig !== undefined) this.groupConfig = props.groupConfig as Map<string, GroupStyleConfig>;
    if (props.groupStyle !== undefined) this.groupStyle = props.groupStyle as (name: string) => GroupStyleConfig | undefined;
    if (props.columnConfig !== undefined) this.columnConfig = props.columnConfig as readonly TableColumnConfig[];
    if (props.columnRenderers !== undefined) this.columnRenderers = props.columnRenderers as ReadonlyMap<ColumnId, ColumnRenderer>;
    if (props.rowStyle !== undefined) this.rowStyle = props.rowStyle as readonly RowStyleRule[];
    if (props.selection !== undefined) this.selection = props.selection as SelectionMode;
    if (props.sortable !== undefined) this.sortable = props.sortable as boolean;
    if (props.preset !== undefined) this.preset = props.preset as 'sectioned' | 'spreadsheet' | 'list';
    if (props.defaultExpanded !== undefined) this.defaultExpanded = props.defaultExpanded as boolean;
    super.configure(props);
  }

  async refresh(): Promise<void> {
    this.dataSource.refresh();
  }

  override render() {
    if (this.loading) return html`<div class="empty">Loading...</div>`;
    if (this.error) return html`<div class="empty">${this.error}</div>`;
    if (!this.groupBy || !this.dataSet || this.dataSet.rows.length === 0) {
      return html`<div class="empty">No data</div>`;
    }
    return html`<div class="container"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-grouped-data-view': GroupedDataView;
  }
}
