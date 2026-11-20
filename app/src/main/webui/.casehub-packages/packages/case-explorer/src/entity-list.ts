import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { fromRows } from '@casehubio/pages-data';
import { ColumnType, columnId as toColumnId } from '@casehubio/pages-data';
import type { TypedDataSet, ColumnId } from '@casehubio/pages-data';
import '@casehubio/mosaic-list-pane';
import type { TypedRow } from '@casehubio/pages-data';
import type { EntityTypeRegistration, EntitySelection, FilterDescriptor } from './types.js';
import { DEFAULT_READER, DEFAULT_RESPONSE_READER } from './readers.js';

const ENTITY_ID_COLUMN = toColumnId('_entityId');

export const EntityListTopics = {
  ENTITY_SELECTED: 'entity.selected',
} as const;

export interface EntityListProps {
  endpoint: string;
  selectionTopic: string;
  pageSize: number;
}

@customElement('agency-entity-list')
export class EntityList extends LiveRegionMixin(LitElement) {
  @property({ attribute: false }) registration?: EntityTypeRegistration;
  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = '';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;
  @property({ type: Number, attribute: 'page-size' }) pageSize = 25;

  @state() _loading = false;
  @state() _error: string | null = null;
  @state() private _entities: any[] = [];
  @state() private _nextCursor: string | null = null;
  @state() private _dataSet: TypedDataSet | undefined;
  @state() private _filters: Record<string, string> = {};

  static override styles = css`
    :host { display: block; }

    .filter-bar {
      display: flex;
      gap: 8px;
      padding: 8px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--pages-neutral-5, #ccc);
    }

    .filter-bar label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
    }

    .filter-bar select, .filter-bar input {
      padding: 4px 8px;
      border: 1px solid var(--pages-neutral-5, #ccc);
      border-radius: 4px;
      font-size: 0.8125rem;
    }

    .load-more {
      display: flex;
      justify-content: center;
      padding: 8px;
    }

    .load-more button {
      padding: 6px 16px;
      border: 1px solid var(--pages-neutral-5, #ccc);
      border-radius: 4px;
      background: var(--pages-neutral-3, #fff);
      cursor: pointer;
      font-size: 0.875rem;
    }

    .load-more button:hover { background: var(--pages-neutral-4, #f0f0f0); }

    .error {
      padding: 16px;
      color: var(--pages-error-9, #dc3545);
      text-align: center;
    }

    .error button {
      margin-left: 8px;
      padding: 4px 12px;
      border: 1px solid var(--pages-neutral-5, #ccc);
      border-radius: 4px;
      cursor: pointer;
    }
  `;

  private _prevRegistrationType: string | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this._prevRegistrationType = this.registration?.type;
    this._fetchEntities();
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('registration') && this.registration) {
      const newType = this.registration.type;
      if (this._prevRegistrationType !== undefined && this._prevRegistrationType !== newType) {
        this._resetAndFetch();
      }
      this._prevRegistrationType = newType;
    }
  }

  override render(): TemplateResult {
    const reg = this.registration;
    if (!reg) return html``;

    return html`
      ${this._renderFilters(reg.filters)}
      ${this._error ? html`
        <div class="error" role="alert">
          ${this._error}
          <button @click=${() => this._fetchEntities()}>Retry</button>
        </div>
      ` : nothing}
      <agency-list-pane
        .dataSet=${this._dataSet}
        .columnConfig=${[{ id: ENTITY_ID_COLUMN, visible: false }, ...reg.columnConfig]}
        .columnRenderers=${reg.columnRenderers ? new Map(Object.entries(reg.columnRenderers)) : undefined}
        .getRowKey=${this._getRowKey}
        .loading=${this._loading}
        .pageSize=${this.pageSize}
        selection-topic=${this.selectionTopic ? `${this.selectionTopic}:_internal` : ''}
        @row-activate=${this._onRowActivate}
      ></agency-list-pane>
      ${this._nextCursor ? html`
        <div class="load-more">
          <button @click=${() => this._loadMore()} ?disabled=${this._loading}>Load more</button>
        </div>
      ` : nothing}
    `;
  }

  private _renderFilters(filters?: readonly FilterDescriptor[]): TemplateResult | typeof nothing {
    if (!filters || filters.length === 0) return nothing;
    return html`
      <div class="filter-bar">
        ${filters.map(f => this._renderFilter(f))}
      </div>
    `;
  }

  private _renderFilter(filter: FilterDescriptor): TemplateResult {
    switch (filter.type) {
      case 'select':
        return html`
          <label>
            ${filter.label}
            <select @change=${(e: Event) => this._onFilterChange(filter.field, (e.target as HTMLSelectElement).value)}>
              <option value="">All</option>
              ${(filter.options ?? []).map(o => html`<option value=${o.value}>${o.label}</option>`)}
            </select>
          </label>
        `;
      case 'text':
        return html`
          <label>
            ${filter.label}
            <input type="text" @input=${(e: Event) => this._onFilterChange(filter.field, (e.target as HTMLInputElement).value)} />
          </label>
        `;
      default:
        return html``;
    }
  }

  private _getRowKey = (row: TypedRow): string => {
    return row.text(ENTITY_ID_COLUMN);
  };

  private _onFilterChange(field: string, value: string): void {
    if (value) {
      this._filters = { ...this._filters, [field]: value };
    } else {
      const next = { ...this._filters };
      delete next[field];
      this._filters = next;
    }
    this._resetAndFetch();
  }

  private _resetAndFetch(): void {
    this._entities = [];
    this._nextCursor = null;
    this._dataSet = undefined;
    this._fetchEntities();
  }

  private _onRowActivate = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const key = detail?.key as string | undefined;
    const reader = this.registration?.reader ?? DEFAULT_READER;
    const entity = key
      ? this._entities.find(ent => reader.id(ent) === key)
      : this._entities[0];
    if (entity) {
      this._handleRowActivation({ id: reader.id(entity), type: reader.type?.(entity) ?? this.registration?.type ?? '' });
    }
  };

  _handleRowActivation(selection: EntitySelection): void {
    if (this.selectionTopic) {
      emitPagesEvent(document, `${this.selectionTopic}:selected`, selection);
    }
  }

  private async _fetchEntities(cursor?: string): Promise<void> {
    const reg = this.registration;
    if (!reg) return;

    const endpoint = reg.listEndpoint ?? this.endpoint;
    if (!endpoint) return;

    this._loading = true;
    this._error = null;

    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('limit', String(this.pageSize));
      if (cursor) url.searchParams.set('cursor', cursor);
      for (const [key, value] of Object.entries(this._filters)) {
        url.searchParams.set(key, value);
      }

      const response = await this.fetchFn(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        this._error = `Failed to load: ${response.statusText}`;
        this.announce(`Error loading ${reg.label}: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      const responseReader = this.registration?.responseReader ?? DEFAULT_RESPONSE_READER;

      if (cursor) {
        this._entities = [...this._entities, ...responseReader.entities(data)];
      } else {
        this._entities = [...responseReader.entities(data)];
      }

      this._nextCursor = responseReader.nextCursor?.(data) ?? null;
      this._dataSet = this._buildDataSet(this._entities, reg);
      this.announce(`Loaded ${String(this._entities.length)} ${reg.label.toLowerCase()}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this._error = `Failed to load: ${message}`;
      this.announce(`Error loading ${reg.label}: ${message}`);
    } finally {
      this._loading = false;
    }
  }

  private _loadMore(): void {
    if (this._nextCursor) {
      this._fetchEntities(this._nextCursor);
    }
  }

  private _buildDataSet(entities: readonly any[], reg: EntityTypeRegistration): TypedDataSet {
    const reader = reg.reader ?? DEFAULT_READER;
    const idColumn = {
      id: ENTITY_ID_COLUMN,
      name: '_entityId',
      type: ColumnType.TEXT,
      getValue: (entity: unknown): unknown => reader.id(entity),
    };

    const dataColumns = reg.columnConfig.map(col => ({
      id: col.id,
      name: col.label ?? String(col.id),
      type: ColumnType.TEXT,
      getValue: (entity: unknown): unknown => {
        const key = String(col.id);
        const record = entity as Record<string, unknown>;
        if (key in record) return record[key];
        const stateBag = reader.state?.(entity);
        return stateBag?.[key];
      },
    }));

    return fromRows(entities, [idColumn, ...dataColumns]);
  }
}
