import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GraphModel } from '@casehubio/graph-core';
import { emitPagesEvent, onPagesEvent } from '@casehubio/pages-data';
import { computeElkLayout, toReactFlowGraph } from '@casehubio/graph-renderer';
import type { ElkLayoutResult } from '@casehubio/graph-renderer';
import { toDOT } from './dot-export.js';
import type { FilterChangePayload } from './types.js';
import './blocks-dependency-toolbar.js';
import '@casehubio/graph-renderer';

type RfNode = ReturnType<typeof toReactFlowGraph>['nodes'][number];
type RfEdge = ReturnType<typeof toReactFlowGraph>['edges'][number];

export interface CaseDependencyGraphProps {
  endpoint?: string;
  selectionTopic: string;
}

@customElement('blocks-case-dependency-graph')
export class BlocksCaseDependencyGraph extends LitElement {
  @property({ type: String }) endpoint: string | undefined;
  @property({ attribute: false }) graphData: GraphModel | undefined;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'case-graph';

  @state() private _model: GraphModel | null = null;
  @state() private _nodes: RfNode[] = [];
  @state() private _edges: RfEdge[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _selectedTypes: Set<string> = new Set();

  private _layout: ElkLayoutResult | null = null;
  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
    .canvas-area { flex: 1; position: relative; overflow: hidden; }
    pages-graph-canvas { width: 100%; height: 100%; }
    .empty, .loading, .error {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-text-tertiary, #999); font-style: italic;
    }
    .error button { margin-left: 8px; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Case dependency graph');
    this._unsubs.push(
      onPagesEvent(this, 'dependency-toolbar:filter-change', (p: unknown) => {
        this._selectedTypes = (p as FilterChangePayload).selectedTypes;
        this._applyFilter();
      }),
      onPagesEvent(this, 'dependency-toolbar:refresh', () => this.refresh()),
      onPagesEvent(this, 'dependency-toolbar:export-dot', () => this._downloadDOT()),
    );
  }

  override disconnectedCallback(): void {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
    super.disconnectedCallback();
  }

  override async updated(changed: Map<PropertyKey, unknown>): Promise<void> {
    if (changed.has('graphData') || changed.has('endpoint')) {
      if (this.graphData) {
        this._model = this.graphData;
        this._error = null;
        this._loading = false;
        await this._buildGraph();
      } else if (this.endpoint) {
        await this._fetchData();
      } else {
        this._model = null;
        this._nodes = [];
        this._edges = [];
      }
    }
  }

  exportDOT(): string {
    return this._model ? toDOT(this._model) : '';
  }

  async refresh(): Promise<void> {
    if (this.endpoint) await this._fetchData();
    else if (this._model) await this._buildGraph();
  }

  private async _fetchData(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    this._error = null;
    try {
      const res = await fetch(this.endpoint, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._model = await res.json() as GraphModel;
      await this._buildGraph();
    } catch (e) {
      this._error = e instanceof Error ? e.message : String(e);
    } finally {
      this._loading = false;
    }
  }

  private async _buildGraph(): Promise<void> {
    const model = this._model;
    if (!model || model.nodes.length === 0) {
      this._nodes = [];
      this._edges = [];
      return;
    }

    const nodeIds = new Set(model.nodes.map(n => n.id));
    const validModel: GraphModel = {
      nodes: model.nodes,
      edges: model.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target)),
    };

    this._selectedTypes = new Set(validModel.edges.map(e => e.type));

    try {
      this._layout = await computeElkLayout(validModel, { algorithm: 'force', spacing: 150 });
      const { nodes, edges } = toReactFlowGraph(validModel, this._layout);
      this._nodes = nodes;
      this._edges = edges;
    } catch (e) {
      this._error = e instanceof Error ? e.message : String(e);
    }
  }

  private _applyFilter(): void {
    if (!this._model || !this._layout) return;
    const nodeIds = new Set(this._model.nodes.map(n => n.id));
    const filteredModel: GraphModel = {
      nodes: this._model.nodes,
      edges: this._model.edges.filter(
        e => nodeIds.has(e.source) && nodeIds.has(e.target) && this._selectedTypes.has(e.type),
      ),
    };
    const { nodes, edges } = toReactFlowGraph(filteredModel, this._layout);
    this._nodes = nodes;
    this._edges = edges;
  }

  private _downloadDOT(): void {
    const dot = this.exportDOT();
    if (!dot) return;
    const blob = new Blob([dot], { type: 'text/vnd.graphviz' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dependencies.dot'; a.click();
    URL.revokeObjectURL(url);
  }

  private _edgeTypeSummary(): Array<{ type: string; count: number }> {
    if (!this._model) return [];
    const counts = new Map<string, number>();
    for (const e of this._model.edges) {
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
    return [...counts.entries()].map(([type, count]) => ({ type, count }));
  }

  override render() {
    if (this._loading) return html`<div class="loading">Loading graph...</div>`;
    if (this._error) return html`<div class="error">Error: ${this._error} <button @click=${() => this.refresh()}>Retry</button></div>`;
    if (!this._model || this._model.nodes.length === 0) return html`<div class="empty">No graph data</div>`;

    const nodeCount = this._model.nodes.length;
    const edgeCount = this._model.edges.length;
    const ariaLabel = `Case dependency graph: ${nodeCount} case${nodeCount !== 1 ? 's' : ''}, ${edgeCount} relationship${edgeCount !== 1 ? 's' : ''}`;

    return html`
      <blocks-dependency-toolbar
        .edgeTypes=${this._edgeTypeSummary()}
        .selectedTypes=${this._selectedTypes}
        .nodeCount=${nodeCount}
        .edgeCount=${edgeCount}
      ></blocks-dependency-toolbar>
      <div class="canvas-area">
        <pages-graph-canvas
          .nodes=${this._nodes}
          .edges=${this._edges}
          role="img"
          aria-label=${ariaLabel}
          @pages-event=${(e: CustomEvent) => {
            if (e.detail?.topic === 'graph:node:click') {
              const nodeId = e.detail.payload?.nodeId as string | undefined;
              if (nodeId) emitPagesEvent(this, `${this.selectionTopic}:selected`, { id: nodeId });
            }
          }}
        ></pages-graph-canvas>
      </div>
    `;
  }
}
