import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { PushMixin } from '@casehubio/pages-component';
import type { ReconciliationSnapshot, ClusterReconciliationStatus, NodeReconciliationStatus } from './types.js';

export const ReconciliationStatusTopics = {
  NODE_SELECTED: 'reconciliation.node-selected',
  TRIGGER_REQUESTED: 'reconciliation.trigger-requested',
} as const;

const NODE_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  CONVERGED: { bg: 'var(--pages-success-3, #d4edda)', fg: 'var(--pages-success-11, #155724)' },
  DRIFTED: { bg: 'var(--pages-warning-3, #fff3cd)', fg: 'var(--pages-warning-11, #856404)' },
  FAULTED: { bg: 'var(--pages-danger-3, #f8d7da)', fg: 'var(--pages-danger-11, #721c24)' },
  PROVISIONING: { bg: 'var(--pages-accent-3, #dbeafe)', fg: 'var(--pages-accent-11, #1e40af)' },
  ABSENT: { bg: 'var(--pages-neutral-3, #e9ecef)', fg: 'var(--pages-neutral-11, #495057)' },
};

export interface ReconciliationStatusProps {
  data: ReconciliationSnapshot | null;
  endpoint?: string;
}

@customElement('agency-reconciliation-status')
export class ReconciliationStatus extends PushMixin(LitElement) {
  @property({ attribute: false }) data: ReconciliationSnapshot | null = null;
  @property() endpoint?: string;

  @state() private _fetchedData: ReconciliationSnapshot | null = null;
  @state() private _loading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Reconciliation status');
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .last-reconciled {
      font-size: 12px;
      color: var(--pages-text-secondary, #6c757d);
    }
    .trigger-btn {
      background: var(--pages-accent-9, #3b82f6);
      color: white;
      border: none;
      border-radius: var(--pages-radius-2, 4px);
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .trigger-btn:hover { opacity: 0.9; }
    .cluster-section {
      margin-bottom: var(--pages-space-4, 1rem);
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-3, 8px);
      overflow: hidden;
    }
    .cluster-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pages-space-3, 0.75rem);
      background: var(--pages-neutral-2, #f8f9fa);
      border-bottom: 1px solid var(--pages-neutral-6, #dee2e6);
    }
    .cluster-name { font-weight: 600; font-size: 14px; }
    .cluster-summary {
      display: flex;
      gap: var(--pages-space-3, 0.75rem);
      font-size: 12px;
      color: var(--pages-text-secondary, #6c757d);
    }
    .summary-item { display: flex; align-items: center; gap: 4px; }
    .summary-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .node-row {
      display: grid;
      grid-template-columns: 1fr 2fr 2fr auto;
      gap: var(--pages-space-2, 0.5rem);
      padding: var(--pages-space-2, 0.5rem) var(--pages-space-3, 0.75rem);
      border-bottom: 1px solid var(--pages-neutral-4, #e9ecef);
      font-size: 13px;
      cursor: pointer;
      align-items: center;
    }
    .node-row:hover { background: var(--pages-neutral-2, #f8f9fa); }
    .node-row:last-child { border-bottom: none; }
    .node-type { font-weight: 500; color: var(--pages-text-primary, #212529); }
    .node-spec {
      font-family: var(--pages-font-mono, monospace);
      font-size: 12px;
      color: var(--pages-text-secondary, #6c757d);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .node-status-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: var(--pages-radius-2, 4px);
      font-weight: 600;
      font-size: 11px;
      text-align: center;
    }
    .empty {
      color: var(--pages-neutral-9, #888);
      font-style: italic;
      padding: var(--pages-space-4, 1rem);
    }
  `;

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('endpoint') && this.endpoint && !this.data) {
      this._fetchFromEndpoint();
    }
  }

  override onPushEvent(event: unknown): void {
    this.data = event as ReconciliationSnapshot;
  }

  private async _fetchFromEndpoint(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const resp = await fetch(this.endpoint);
      if (resp.ok) {
        this._fetchedData = await resp.json() as ReconciliationSnapshot;
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): ReconciliationSnapshot | null {
    return this.data ?? this._fetchedData;
  }

  private _handleNodeClick(node: NodeReconciliationStatus, clusterId: string): void {
    emitPagesEvent(this, ReconciliationStatusTopics.NODE_SELECTED, {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      status: node.status,
      clusterId,
    });
  }

  private _handleTrigger(): void {
    emitPagesEvent(this, ReconciliationStatusTopics.TRIGGER_REQUESTED, {});
  }

  private _renderNode(node: NodeReconciliationStatus, clusterId: string) {
    const colors = (NODE_STATUS_COLORS[node.status] ?? NODE_STATUS_COLORS.ABSENT)!;
    return html`
      <div class="node-row" @click=${() => this._handleNodeClick(node, clusterId)}>
        <span class="node-type">${node.nodeType}</span>
        <span class="node-spec" title="${node.desired}">${node.desired}</span>
        <span class="node-spec" title="${node.actual}">${node.actual}</span>
        <span class="node-status-badge"
              style="background: ${colors.bg}; color: ${colors.fg};">${node.status}</span>
      </div>
    `;
  }

  private _renderCluster(cluster: ClusterReconciliationStatus) {
    return html`
      <div class="cluster-section">
        <div class="cluster-header">
          <span class="cluster-name">${cluster.clusterName}</span>
          <div class="cluster-summary">
            <span class="summary-item">
              <span class="summary-dot" style="background: var(--pages-success-9, #28a745);"></span>
              ${cluster.convergedCount}
            </span>
            <span class="summary-item">
              <span class="summary-dot" style="background: var(--pages-warning-9, #ffc107);"></span>
              ${cluster.driftedCount}
            </span>
            <span class="summary-item">
              <span class="summary-dot" style="background: var(--pages-danger-9, #dc3545);"></span>
              ${cluster.faultedCount}
            </span>
          </div>
        </div>
        ${cluster.nodes.map(n => this._renderNode(n, cluster.clusterId))}
      </div>
    `;
  }

  override render() {
    this.setAttribute('aria-busy', String(this._loading));
    if (this._loading) return html`<div class="empty">Loading reconciliation data...</div>`;
    const snapshot = this._effectiveData;
    if (!snapshot) return html`<div class="empty">No reconciliation data</div>`;
    if (snapshot.clusters.length === 0) return html`<div class="empty">No clusters in reconciliation</div>`;

    return html`
      <div class="header">
        ${snapshot.lastReconciled
          ? html`<span class="last-reconciled">Last reconciled: ${snapshot.lastReconciled}</span>`
          : ''}
        <button class="trigger-btn" @click=${this._handleTrigger}>Trigger Reconciliation</button>
      </div>
      ${snapshot.clusters.map(c => this._renderCluster(c))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-reconciliation-status': ReconciliationStatus;
  }
}
