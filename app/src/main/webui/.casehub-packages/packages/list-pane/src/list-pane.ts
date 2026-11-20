import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DataSourceMixin, PushMixin } from '@casehubio/pages-component';
import { emitPagesEvent, onPagesEvent } from '@casehubio/pages-data';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import '@casehubio/pages-table';
import type { TypedRow, ColumnId } from '@casehubio/pages-data';

export interface ListPaneProps {
  selectionTopic: string;
  emptyMessage: string;
  pageSize: number;
}

@customElement('agency-list-pane')
export class ListPane extends PushMixin(DataSourceMixin(LitElement)) {
  @property({ attribute: false }) columnConfig?: readonly TableColumnConfig[];
  @property({ attribute: false }) columnRenderers?: ReadonlyMap<ColumnId, ColumnRenderer>;
  @property({ attribute: false }) getRowKey?: (row: TypedRow) => string;
  @property({ attribute: false }) getRowClass?: (row: TypedRow) => string;
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = '';
  @property({ type: String, attribute: 'empty-message' }) emptyMessage = 'No items found';
  @property({ type: Number, attribute: 'page-size' }) pageSize = 25;

  private _refreshUnsub?: () => void;
  private _lastActivatedIndex = -1;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-7, #525252);
      font-size: var(--pages-font-size-sm, 12px);
    }

    pages-table {
      flex: 1;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('tabindex', '-1');
    if (this.selectionTopic) {
      this._refreshUnsub = onPagesEvent(document, `${this.selectionTopic}:refresh`, () => {
        this.refresh();
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._refreshUnsub?.();
  }

  override onPushEvent(_event: unknown): void {
    this.refresh();
  }

  refresh(): void {
    this.dataSource.refresh();
  }

  override focus(): void {
    const table = this.shadowRoot?.querySelector('pages-table') as HTMLElement | undefined;
    table?.focus();
  }

  private _handleRowActivate = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    this._lastActivatedIndex = detail.index ?? -1;
    if (this.selectionTopic && detail.row) {
      emitPagesEvent(document, `${this.selectionTopic}:selected`, detail.row);
    }
  };

  override render() {
    if (!this.loading && (!this.dataSet || this.dataSet.rows.length === 0) && !this.error) {
      return html`<div class="empty" role="status">${this.emptyMessage}</div>`;
    }

    return html`
      <pages-table
        .dataSet=${this.dataSet}
        .columnConfig=${this.columnConfig}
        .columnRenderers=${this.columnRenderers}
        .getRowKey=${this.getRowKey}
        .getRowClass=${this.getRowClass}
        .totalRows=${this.dataSource.controller.totalRows > 0 ? this.dataSource.controller.totalRows : undefined}
        .pageSize=${this.pageSize}
        .loading=${this.loading}
        .emptyMessage=${this.emptyMessage}
        selection="single"
        mode="paginated"
        client-sort
        client-filter
        @row-activate=${this._handleRowActivate}
      ></pages-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-list-pane': ListPane;
  }
}
