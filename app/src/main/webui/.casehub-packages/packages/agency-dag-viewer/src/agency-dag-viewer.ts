import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  dagToGraph, dagToDecorations, registerHtnStencils,
  type DagPlanSnapshot, type DagResultSnapshot, type DagDispatchMode, type DagAdapterResult,
} from '@casehubio/mosaic-graph-stencil-htn';
import type { NodeDecoration } from '@casehubio/graph-core';
import { computeElkLayout, toReactFlowGraph } from '@casehubio/graph-renderer';
import type { ElkLayoutResult } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';
import '@casehubio/graph-renderer';
import './agency-dag-toolbar.js';

export interface DagViewerProps {
  dagPlan: DagPlanSnapshot | null;
  dagResult: DagResultSnapshot | null;
  dispatchMode: DagDispatchMode | null;
  selectionTopic: string;
}

@customElement('agency-dag-viewer')
export class AgencyDagViewer extends LitElement {
  @property({ type: Object }) dagPlan: DagPlanSnapshot | null = null;
  @property({ type: Object }) dagResult: DagResultSnapshot | null = null;
  @property({ type: String }) dispatchMode: DagDispatchMode | null = null;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'dag-node';

  @state() private _adapterResult: DagAdapterResult | null = null;
  @state() private _decorations: ReadonlyMap<string, NodeDecoration> = new Map();
  @state() private _nodes: ReturnType<typeof toReactFlowGraph>['nodes'] = [];
  @state() private _edges: ReturnType<typeof toReactFlowGraph>['edges'] = [];
  private _lastLayout: ElkLayoutResult | undefined;
  private _pendingPlanTimestamp: string | null = null;
  private _renderInProgress = false;

  override connectedCallback(): void {
    super.connectedCallback();
    registerHtnStencils();
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('dagPlan')) {
      this._decorations = new Map();
      if (this.dagPlan != null) this._fullRender(this.dagPlan);
      else {
        this._adapterResult = null;
        this._nodes = [];
        this._edges = [];
      }
    }
    if (changed.has('dagResult') && !changed.has('dagPlan')) {
      this._updateDecorations();
    }
  }

  private async _fullRender(plan: DagPlanSnapshot): Promise<void> {
    if (this._renderInProgress) {
      this._pendingPlanTimestamp = plan.timestamp;
      return;
    }
    this._renderInProgress = true;
    this._adapterResult = dagToGraph(plan);
    const layout = await computeElkLayout(this._adapterResult.model, { direction: 'DOWN', spacing: 60 });
    this._lastLayout = layout;
    this._updateDecorations();
    this._renderInProgress = false;

    if (this._pendingPlanTimestamp != null && this._pendingPlanTimestamp !== plan.timestamp) {
      const pending = this._pendingPlanTimestamp;
      this._pendingPlanTimestamp = null;
      if (this.dagPlan != null && this.dagPlan.timestamp === pending) {
        await this._fullRender(this.dagPlan);
      }
    }
  }

  private _updateDecorations(): void {
    if (this.dagResult == null) { this._decorations = new Map(); this._applyLayout(); return; }
    const raw = dagToDecorations(this.dagResult);
    if (this._adapterResult == null) { this._decorations = raw; return; }
    const knownIds = new Set(this._adapterResult.model.nodes.map((n: { id: string }) => n.id));
    const filtered = new Map<string, NodeDecoration>();
    for (const [k, v] of raw) {
      if (knownIds.has(k)) filtered.set(k, v);
    }
    this._decorations = filtered;
    this._applyLayout();
  }

  private _applyLayout(): void {
    if (!this._adapterResult || !this._lastLayout) return;
    const { nodes, edges } = toReactFlowGraph(this._adapterResult.model, this._lastLayout, this._decorations);
    this._nodes = nodes;
    this._edges = edges;
  }

  private _computeStats() {
    if (this.dagResult == null || this._adapterResult == null) {
      return { nodeCount: 0, completed: 0, running: 0, failed: 0 };
    }
    const states = Object.values(this.dagResult.nodeStates) as import('@casehubio/mosaic-graph-stencil-htn').NodeStateSnapshot[];
    return {
      nodeCount: this._adapterResult.model.nodes.length,
      completed: states.filter(s => s.kind === 'Completed').length,
      running: states.filter(s => s.kind === 'Dispatched').length,
      failed: states.filter(s => s.kind === 'Failed').length,
    };
  }

  private _onNodeClick(taskId: string): void {
    emitPagesEvent(this, this.selectionTopic, { taskId });
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
    .canvas-area { flex: 1; position: relative; }
    .empty { display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-text-tertiary, #999); font-style: italic; }
  `;

  override render() {
    const stats = this._computeStats();
    return html`
      <agency-dag-toolbar
        .dispatchMode=${this.dispatchMode}
        .nodeCount=${stats.nodeCount}
        .completedCount=${stats.completed}
        .runningCount=${stats.running}
        .failedCount=${stats.failed}
        .elapsed=${this.dagResult?.elapsed ?? null}
        .resultTimestamp=${this.dagResult?.timestamp ?? null}
      ></agency-dag-toolbar>
      <div class="canvas-area" role="img" aria-label="DAG execution graph">
        ${this.dagPlan == null
          ? html`<div class="empty">No DAG plan loaded</div>`
          : html`<pages-graph-canvas
              .nodes=${this._nodes}
              .edges=${this._edges}
              style="width: 100%; height: 100%;"
              @pages-event=${(e: CustomEvent) => {
                if (e.detail?.topic === 'graph:node:click') {
                  const graphNodeId = e.detail.payload?.nodeId as string | undefined;
                  if (graphNodeId?.startsWith('dag:')) this._onNodeClick(graphNodeId.slice(4));
                }
              }}
            ></pages-graph-canvas>`}
      </div>
    `;
  }
}
