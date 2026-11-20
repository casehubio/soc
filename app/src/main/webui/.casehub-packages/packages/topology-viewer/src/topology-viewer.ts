import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { PushMixin } from '@casehubio/pages-component';
import type { GraphModel } from '@casehubio/graph-core';
import type { TopologySnapshot, TopologyNode, TopologyEdge, TopologyNodeStatus } from './types.js';

export const TopologyViewerTopics = {
  NODE_SELECTED: 'topology.node-selected',
} as const;

const STATUS_COLORS: Record<TopologyNodeStatus, { bg: string; fg: string; border: string }> = {
  RUNNING: { bg: 'var(--pages-success-3, #d4edda)', fg: 'var(--pages-success-11, #155724)', border: 'var(--pages-success-7, #82c891)' },
  DEGRADED: { bg: 'var(--pages-warning-3, #fff3cd)', fg: 'var(--pages-warning-11, #856404)', border: 'var(--pages-warning-7, #f0c040)' },
  DEPLOYING: { bg: 'var(--pages-accent-3, #dbeafe)', fg: 'var(--pages-accent-11, #1e40af)', border: 'var(--pages-accent-7, #93b8f0)' },
  FAULTED: { bg: 'var(--pages-danger-3, #f8d7da)', fg: 'var(--pages-danger-11, #721c24)', border: 'var(--pages-danger-7, #e88490)' },
  ABSENT: { bg: 'var(--pages-neutral-3, #e9ecef)', fg: 'var(--pages-neutral-11, #495057)', border: 'var(--pages-neutral-7, #adb5bd)' },
};

function toGraphModel(snapshot: TopologySnapshot): GraphModel {
  return {
    nodes: snapshot.services.map(s => ({
      id: s.id,
      type: 'topology-service',
      properties: { label: s.name, ...s } as Record<string, unknown>,
    })),
    edges: snapshot.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.source,
      target: e.target,
      type: 'topology-dependency',
      properties: { label: e.label },
    })),
  };
}

export interface TopologyViewerProps {
  data: TopologySnapshot | null;
  endpoint?: string;
  selectionTopic: string;
}

@customElement('agency-topology-viewer')
export class TopologyViewer extends PushMixin(LitElement) {
  @property({ attribute: false }) data: TopologySnapshot | null = null;
  @property() endpoint?: string;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'topology.node-selected';

  @state() private _graphModel: GraphModel | null = null;
  @state() private _fetchedData: TopologySnapshot | null = null;
  @state() private _loading = false;

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pages-space-2, 0.5rem) var(--pages-space-3, 0.75rem);
      border-bottom: 1px solid var(--pages-neutral-6, #dee2e6);
      font-size: 13px;
      color: var(--pages-text-secondary, #6c757d);
    }
    .stats { display: flex; gap: var(--pages-space-3, 0.75rem); }
    .stat { display: flex; align-items: center; gap: 4px; }
    .stat-value { font-weight: 600; color: var(--pages-text-primary, #212529); }
    .canvas-area { flex: 1; position: relative; overflow: auto; padding: var(--pages-space-4, 1rem); }
    .node-list { display: flex; flex-wrap: wrap; gap: var(--pages-space-3, 0.75rem); }
    .topology-node {
      border: 2px solid;
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-3, 0.75rem);
      min-width: 160px;
      cursor: pointer;
      transition: box-shadow 0.15s ease;
    }
    .topology-node:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); }
    .node-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .node-meta { font-size: 12px; opacity: 0.8; }
    .node-status {
      display: inline-block;
      padding: 1px 8px;
      border-radius: var(--pages-radius-2, 4px);
      font-weight: 600;
      font-size: 11px;
      margin-top: 6px;
    }
    .edge-list {
      margin-top: var(--pages-space-4, 1rem);
      border-top: 1px solid var(--pages-neutral-4, #e9ecef);
      padding-top: var(--pages-space-3, 0.75rem);
    }
    .edge-title { font-weight: 600; font-size: 13px; margin-bottom: var(--pages-space-2, 0.5rem); color: var(--pages-text-primary, #212529); }
    .edge {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      font-size: 12px;
      color: var(--pages-text-secondary, #6c757d);
      padding: 2px 0;
    }
    .edge-arrow { color: var(--pages-neutral-9, #888); }
    .edge-label {
      font-size: 11px;
      padding: 1px 6px;
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-1, 2px);
      color: var(--pages-text-secondary, #6c757d);
    }
    .empty { display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-text-tertiary, #999); font-style: italic; }
  `;

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('data') && this.data) {
      this._graphModel = toGraphModel(this.data);
    }
    if (changed.has('endpoint') && this.endpoint && !this.data) {
      this._fetchFromEndpoint();
    }
  }

  override onPushEvent(event: unknown): void {
    const update = event as { serviceId: string; status: TopologyNodeStatus };
    if (this.data && update.serviceId) {
      this.data = {
        ...this.data,
        services: this.data.services.map(s =>
          s.id === update.serviceId ? { ...s, status: update.status } : s
        ),
      };
    }
  }

  private async _fetchFromEndpoint(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const resp = await fetch(this.endpoint);
      if (resp.ok) {
        this._fetchedData = await resp.json() as TopologySnapshot;
        this._graphModel = toGraphModel(this._fetchedData);
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): TopologySnapshot | null {
    return this.data ?? this._fetchedData;
  }

  private _handleNodeClick(node: TopologyNode): void {
    emitPagesEvent(this, this.selectionTopic, {
      serviceId: node.id,
      serviceName: node.name,
      status: node.status,
    });
  }

  private _computeStats() {
    const d = this._effectiveData;
    if (!d) return { serviceCount: 0, edgeCount: 0, healthyCount: 0, degradedCount: 0 };
    return {
      serviceCount: d.services.length,
      edgeCount: d.edges.length,
      healthyCount: d.services.filter(s => s.status === 'RUNNING').length,
      degradedCount: d.services.filter(s => s.status !== 'RUNNING').length,
    };
  }

  private _renderNode(node: TopologyNode) {
    const colors = (STATUS_COLORS[node.status] ?? STATUS_COLORS.ABSENT)!;
    return html`
      <div class="topology-node" @click=${() => this._handleNodeClick(node)}
           style="border-color: ${colors.border}; background: ${colors.bg};"
           role="button" tabindex="0" aria-label="${node.name} — ${node.status}">
        <div class="node-name" style="color: ${colors.fg};">${node.name}</div>
        ${node.replicas != null
          ? html`<div class="node-meta">${node.replicas} replica${node.replicas !== 1 ? 's' : ''}</div>`
          : ''}
        ${node.image ? html`<div class="node-meta">${node.image}</div>` : ''}
        <span class="node-status" style="background: ${colors.bg}; color: ${colors.fg};">${node.status}</span>
      </div>
    `;
  }

  private _renderEdge(edge: TopologyEdge) {
    const sourceNode = this._effectiveData?.services.find(s => s.id === edge.source);
    const targetNode = this._effectiveData?.services.find(s => s.id === edge.target);
    return html`
      <div class="edge">
        <span>${sourceNode?.name ?? edge.source}</span>
        <span class="edge-arrow">→</span>
        <span>${targetNode?.name ?? edge.target}</span>
        ${edge.label ? html`<span class="edge-label">${edge.label}</span>` : ''}
      </div>
    `;
  }

  override render() {
    if (this._loading) return html`<div class="empty">Loading topology...</div>`;
    const d = this._effectiveData;
    if (!d) return html`<div class="empty">No topology data</div>`;
    if (d.services.length === 0) return html`<div class="empty">No services in topology</div>`;

    const stats = this._computeStats();

    return html`
      <div class="toolbar">
        <div class="stats">
          <span class="stat">Services: <span class="stat-value">${stats.serviceCount}</span></span>
          <span class="stat">Dependencies: <span class="stat-value">${stats.edgeCount}</span></span>
          <span class="stat">Healthy: <span class="stat-value">${stats.healthyCount}</span></span>
          ${stats.degradedCount > 0
            ? html`<span class="stat">Issues: <span class="stat-value">${stats.degradedCount}</span></span>`
            : ''}
        </div>
      </div>
      <div class="canvas-area">
        <div class="node-list">
          ${d.services.map(s => this._renderNode(s))}
        </div>
        ${d.edges.length > 0 ? html`
          <div class="edge-list">
            <div class="edge-title">Dependencies</div>
            ${d.edges.map(e => this._renderEdge(e))}
          </div>
        ` : ''}
        <!-- pages-graph-canvas integration point: toReactFlowGraph(model, layout, decorations) -->
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-topology-viewer': TopologyViewer;
  }
}
