import { html, css, nothing, type TemplateResult, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { EventTimelineProps, EventTimelineLayout } from "@casehubio/pages-component";
import { emitPagesEvent } from "@casehubio/pages-data";
import { PagesElement } from "../base/PagesElement.js";
import { cellToRaw } from "../base/cell-extract.js";
import type { EventTimelineNode, EventTimelineStrategy, PaginationMeta } from "./event-timeline-types.js";
import { renderVerticalTimeline, verticalTimelineStyles } from "./event-timeline/renderers/vertical.js";
import { renderHorizontalTimeline, horizontalTimelineStyles } from "./event-timeline/renderers/horizontal.js";
import { renderCompactTimeline, compactTimelineStyles } from "./event-timeline/renderers/compact.js";
import { renderFilterBar, filterBarStyles } from "./event-timeline/renderers/filter-bar.js";

const chronologicalStrategy: EventTimelineStrategy<EventTimelineNode[]> = {
  toNodes: (data) => [...data].sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  }),
  defaultLayout: "vertical",
};

@customElement("pages-event-timeline")
export class PagesEventTimeline extends PagesElement<EventTimelineProps> {
  private static _strategyRegistry = new Map<string, EventTimelineStrategy>([
    ["chronological", chronologicalStrategy],
  ]);

  static registerStrategy(key: string, strategy: EventTimelineStrategy): void {
    PagesEventTimeline._strategyRegistry.set(key, strategy);
  }

  @property({ attribute: false }) strategy?: EventTimelineStrategy;
  @property({ attribute: false }) data?: unknown;
  @property({ attribute: false }) activeFilters?: Set<string> | string[];
  @property({ attribute: false }) renderNode?: (node: EventTimelineNode) => unknown;
  @property({ attribute: false }) renderDetail?: (node: EventTimelineNode) => unknown;
  @property() layout?: EventTimelineLayout;

  @property({ type: String }) endpoint?: string;
  @property({ attribute: false }) headers?: Record<string, string> | (() => Record<string, string>);
  @property({ type: Number }) pageSize = 20;

  @state() private _nodes: EventTimelineNode[] = [];
  @state() private _expandedKeys = new Set<string>();
  @state() private _internalFilters: Set<string> | null = null;
  @state() private _selfFetchLoading = false;
  @state() private _selfFetchError = "";
  @state() private _paginationMeta: PaginationMeta | undefined = undefined;
  @state() private _loadingMore = false;

  private _lastData: unknown = undefined;
  private _paginatedEndpoint: string | undefined = undefined;
  private _paginatedPageSize = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Event timeline');
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); color: var(--pages-neutral-12, #111); }
    .timeline-container { padding: 16px; }
    .empty-state { text-align: center; padding: 24px; color: var(--pages-neutral-9, #6b7280); }
    .error-message { color: var(--pages-error-11, #dc2626); margin-bottom: 12px; }
    .pagination-footer {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 16px; margin-top: 8px;
    }
    .pagination-progress { font-size: 13px; color: var(--pages-neutral-9, #6b7280); }
    .load-more-button {
      padding: 8px 16px;
      border: 1px solid var(--pages-accent-7, #3b82f6);
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-accent-9, #2563eb);
      border-radius: var(--pages-radius-sm, 4px);
      cursor: pointer; font-size: 13px; font-weight: 500;
      transition: background 0.2s;
    }
    .load-more-button:hover { background: var(--pages-accent-3, #dbeafe); }
    .load-more-button:disabled { cursor: default; opacity: 0.6; }
    ${verticalTimelineStyles}
    ${horizontalTimelineStyles}
    ${compactTimelineStyles}
    ${filterBarStyles}
  `;

  private _resolveStrategy(): EventTimelineStrategy | undefined {
    if (this.strategy) return this.strategy;
    const key = this.props?.strategyKey ?? "chronological";
    return PagesEventTimeline._strategyRegistry.get(key);
  }

  private get _activeLayout(): EventTimelineLayout {
    return this.layout ?? this.props?.layout ?? this._resolveStrategy()?.defaultLayout ?? "vertical";
  }

  private get _resolvedFilters(): Set<string> | null {
    if (this.activeFilters != null) {
      return this.activeFilters instanceof Set ? this.activeFilters : new Set(this.activeFilters);
    }
    return this._internalFilters;
  }

  private get _filteredNodes(): EventTimelineNode[] {
    const filters = this._resolvedFilters;
    const strategy = this._resolveStrategy();
    if (!filters || !strategy?.filterCategories) return this._nodes;
    return this._nodes.filter(n => n.category == null || filters.has(n.category));
  }

  private _resolveRenderNode(): ((node: EventTimelineNode) => unknown) | undefined {
    return this.renderNode ?? this._resolveStrategy()?.renderNode;
  }

  private _resolveRenderDetail(): ((node: EventTimelineNode) => unknown) | undefined {
    return this.renderDetail ?? this._resolveStrategy()?.renderDetail;
  }

  private get _isSelfFetch(): boolean {
    return !!this.endpoint && !this.props;
  }

  private get _isPaginated(): boolean {
    return !!this._resolveStrategy()?.supportsPagination && this._isSelfFetch;
  }

  configure(props: Record<string, unknown>): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint as string;
    if (props.strategy !== undefined) this.strategy = props.strategy as EventTimelineStrategy;
    if (props.layout !== undefined) this.layout = props.layout as EventTimelineLayout;
  }

  private _resolveHeaders(): Record<string, string> {
    const h = typeof this.headers === "function" ? this.headers() : this.headers;
    return h ?? {};
  }

  private _buildPagedUrl(page: number): string {
    const base = this.endpoint!;
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}page=${page}&size=${this.pageSize}`;
  }

  private async _fetchPage(page: number): Promise<void> {
    const strategy = this._resolveStrategy();
    if (!strategy) return;
    const url = this._buildPagedUrl(page);
    const headers = this._resolveHeaders();
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      const transformed = strategy.transformData ? strategy.transformData(raw) : raw;
      const newNodes = strategy.toNodes(transformed);
      this._nodes = page === 0 ? newNodes : [...this._nodes, ...newNodes];
      if (strategy.extractPaginationMeta) {
        this._paginationMeta = strategy.extractPaginationMeta(raw);
      }
    } catch (err) {
      this._selfFetchError = err instanceof Error ? err.message : String(err);
    }
  }

  private async _loadMore(): Promise<void> {
    if (!this._paginationMeta || this._loadingMore) return;
    const nextPage = this._paginationMeta.page + 1;
    if (nextPage >= this._paginationMeta.totalPages) return;
    this._loadingMore = true;
    await this._fetchPage(nextPage);
    this._loadingMore = false;
  }

  private async _fetchEndpoint(): Promise<void> {
    const strategy = this._resolveStrategy();
    if (!strategy || !this.endpoint) return;
    this._selfFetchLoading = true;
    this._selfFetchError = "";
    try {
      const headers = this._resolveHeaders();
      const response = await fetch(this.endpoint, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      const transformed = strategy.transformData ? strategy.transformData(raw) : raw;
      this._nodes = strategy.toNodes(transformed);
    } catch (err) {
      this._selfFetchError = err instanceof Error ? err.message : String(err);
    } finally {
      this._selfFetchLoading = false;
    }
  }

  override updated(changed: PropertyValues): void {
    super.updated(changed);

    if (this._isSelfFetch) {
      if (this._isPaginated
          && (changed.has("endpoint") || changed.has("strategy") || changed.has("pageSize"))
          && (this.endpoint !== this._paginatedEndpoint || this.pageSize !== this._paginatedPageSize)) {
        this._paginatedEndpoint = this.endpoint;
        this._paginatedPageSize = this.pageSize;
        this._paginationMeta = undefined;
        this._selfFetchLoading = true;
        void this._fetchPage(0).finally(() => { this._selfFetchLoading = false; });
      } else if (!this._isPaginated && (changed.has("endpoint") || changed.has("strategy"))) {
        void this._fetchEndpoint();
      }
    }

  }

  override render(): TemplateResult {
    if (this._isSelfFetch || this.data != null) {
      return this._renderStandaloneContent();
    }
    return super.render();
  }

  private _renderStandaloneContent(): TemplateResult {
    if (this.data != null && this.data !== this._lastData) {
      this._lastData = this.data;
      const strategy = this._resolveStrategy();
      if (strategy) {
        const transformed = strategy.transformData ? strategy.transformData(this.data) : this.data;
        this._nodes = strategy.toNodes(transformed);
      }
    }

    if (this._nodes.length === 0 && !this._selfFetchError && this._isSelfFetch) {
      return html`<div class="timeline-container">Loading timeline...</div>`;
    }
    if (this._selfFetchError && this._nodes.length === 0) {
      return html`
        <div class="timeline-container">
          <div class="error-message">Failed to load timeline: ${this._selfFetchError}</div>
          <button @click=${() => this._fetchEndpoint()}>Retry</button>
        </div>
      `;
    }
    return this._renderTimeline();
  }

  protected override renderContent(
    props: EventTimelineProps,
    dataset: TypedDataSet,
  ): TemplateResult {
    const strategy = this._resolveStrategy();
    if (!strategy) {
      return html`<div class="empty-state">No strategy configured</div>`;
    }

    if (this.data !== this._lastData || dataset !== this._lastData) {
      this._lastData = this.data ?? dataset;
      const raw = this.data ?? this._dataSetToNodes(dataset);
      const transformed = strategy.transformData ? strategy.transformData(raw) : raw;
      this._nodes = strategy.toNodes(transformed);
    }

    return this._renderTimeline();
  }

  private _renderTimeline(): TemplateResult {
    const strategy = this._resolveStrategy();
    const layout = this._activeLayout;
    const filtered = this._filteredNodes;
    const renderNodeCb = this._resolveRenderNode();
    const renderDetailCb = this._resolveRenderDetail();

    return html`
      <div class="timeline-container">
        ${strategy?.filterCategories && layout !== "compact"
          ? renderFilterBar(
              strategy.filterCategories,
              this._resolvedFilters ?? new Set(strategy.filterCategories),
              (cat) => { this._handleFilterToggle(cat); },
            )
          : nothing}
        ${filtered.length === 0
          ? html`<div class="empty-state">No events</div>`
          : layout === "vertical"
          ? renderVerticalTimeline(filtered, {
              expandedKeys: this._expandedKeys,
              onNodeClick: (n, i) => { this._handleNodeClick(n, i); },
              onToggleExpand: (k) => { this._handleToggleExpand(k); },
              onKeyDown: (e, i) => { this._handleVerticalKeyDown(e, i); },
              renderNode: renderNodeCb,
              renderDetail: renderDetailCb,
            })
          : layout === "horizontal"
          ? renderHorizontalTimeline(filtered, {
              onNodeClick: (n, i) => { this._handleNodeClick(n, i); },
              onKeyDown: (e, i) => { this._handleHorizontalKeyDown(e, i); },
              renderNode: renderNodeCb,
            })
          : renderCompactTimeline(filtered, {
              onExpandRequested: () => { emitPagesEvent(this, "event-timeline:expand-requested", {}); },
              onKeyDown: () => {},
            })}
        ${this._renderPaginationFooter()}
      </div>
    `;
  }

  private _renderPaginationFooter(): TemplateResult | typeof nothing {
    if (!this._paginationMeta || this._activeLayout !== "vertical") return nothing;
    const { page, totalPages, totalElements } = this._paginationMeta;
    const hasMore = page + 1 < totalPages;
    if (!hasMore && this._nodes.length >= totalElements) return nothing;

    return html`
      <div class="pagination-footer">
        <span class="pagination-progress">Showing ${this._nodes.length} of ${totalElements} events</span>
        ${hasMore ? html`
          <button class="load-more-button"
                  ?disabled=${this._loadingMore}
                  @click=${() => this._loadMore()}>
            ${this._loadingMore ? "Loading…" : "Load more"}
          </button>
        ` : nothing}
      </div>
    `;
  }

  private _dataSetToNodes(dataset: TypedDataSet): EventTimelineNode[] {
    if (dataset.columns.length === 0 || dataset.rows.length === 0) return [];
    const cols = dataset.columns;
    const keyCol = cols.find(c => c.id === "key") ?? cols[0];
    const labelCol = cols.find(c => c.id === "label") ?? cols[1];
    const statusCol = cols.find(c => c.id === "status");
    const timestampCol = cols.find(c => c.id === "timestamp");
    const actorCol = cols.find(c => c.id === "actor");
    const categoryCol = cols.find(c => c.id === "category");

    return dataset.rows.map(row => {
      const key = String(keyCol ? cellToRaw(row.cell(keyCol.id)) : "");
      const label = String(labelCol ? cellToRaw(row.cell(labelCol.id)) : "");
      const status = (statusCol ? String(cellToRaw(row.cell(statusCol.id))) : "pending") as EventTimelineNode["status"];
      const ts = timestampCol ? String(cellToRaw(row.cell(timestampCol.id)) ?? "") : "";
      const actor = actorCol ? String(cellToRaw(row.cell(actorCol.id)) ?? "") : "";
      const cat = categoryCol ? String(cellToRaw(row.cell(categoryCol.id)) ?? "") : "";
      return {
        key,
        label,
        status,
        ...(ts ? { timestamp: ts } : {}),
        ...(actor ? { actor } : {}),
        ...(cat ? { category: cat } : {}),
      };
    });
  }

  private _handleFilterToggle(category: string): void {
    const strategy = this._resolveStrategy();
    const allCategories = strategy?.filterCategories ?? [];
    const current = this._resolvedFilters ?? new Set(allCategories);
    const next = new Set(current);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    this._internalFilters = next;
  }

  private _handleToggleExpand(key: string): void {
    const next = new Set(this._expandedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this._expandedKeys = next;
  }

  private _handleNodeClick(node: EventTimelineNode, index: number): void {
    this._handleToggleExpand(node.key);
    emitPagesEvent(this, "event-timeline:node-selected", { node, index });
  }

  private _handleVerticalKeyDown(e: KeyboardEvent, index: number): void {
    const nodes = this.shadowRoot!.querySelectorAll(".timeline-node");
    if (e.key === "ArrowDown" && index < nodes.length - 1) {
      e.preventDefault();
      (nodes[index + 1] as HTMLElement).focus();
    } else if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      (nodes[index - 1] as HTMLElement).focus();
    }
  }

  private _handleHorizontalKeyDown(e: KeyboardEvent, index: number): void {
    const items = this.shadowRoot!.querySelectorAll('[role="listitem"]');
    if (e.key === "ArrowRight" && index < items.length - 1) {
      e.preventDefault();
      (items[index + 1] as HTMLElement).focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      (items[index - 1] as HTMLElement).focus();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pages-event-timeline": PagesEventTimeline;
  }
}
