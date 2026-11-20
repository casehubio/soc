import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ServiceCardData, ClusterDeploymentStatus } from './types.js';

export const ServiceCardTopics = {
  SELECTED: 'service-card.selected',
} as const;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  RUNNING: { bg: 'var(--pages-success-3, #d4edda)', fg: 'var(--pages-success-11, #155724)' },
  DEGRADED: { bg: 'var(--pages-warning-3, #fff3cd)', fg: 'var(--pages-warning-11, #856404)' },
  DEPLOYING: { bg: 'var(--pages-accent-3, #dbeafe)', fg: 'var(--pages-accent-11, #1e40af)' },
  FAULTED: { bg: 'var(--pages-danger-3, #f8d7da)', fg: 'var(--pages-danger-11, #721c24)' },
  ABSENT: { bg: 'var(--pages-neutral-3, #e9ecef)', fg: 'var(--pages-neutral-11, #495057)' },
};

const CLUSTER_STATUS_COLORS: Record<string, string> = {
  converged: 'var(--pages-success-9, #28a745)',
  provisioning: 'var(--pages-accent-9, #3b82f6)',
  faulted: 'var(--pages-danger-9, #dc3545)',
  unknown: 'var(--pages-neutral-9, #888)',
};

export interface ServiceCardProps {
  data: ServiceCardData | null;
  endpoint?: string;
}

@customElement('agency-service-card')
export class ServiceCard extends LitElement {
  @property({ attribute: false }) data: ServiceCardData | null = null;
  @property() endpoint?: string;

  @state() private _fetchedData: ServiceCardData | null = null;
  @state() private _loading = false;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .card {
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      cursor: pointer;
      transition: box-shadow 0.15s ease;
    }
    .card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .service-name {
      font-weight: 600;
      font-size: 16px;
      color: var(--pages-text-primary, #212529);
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: var(--pages-radius-2, 4px);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--pages-text-secondary, #6c757d);
      margin-bottom: var(--pages-space-1, 0.25rem);
    }
    .detail-label { font-weight: 500; }
    .clusters {
      margin-top: var(--pages-space-3, 0.75rem);
      border-top: 1px solid var(--pages-neutral-4, #e9ecef);
      padding-top: var(--pages-space-2, 0.5rem);
    }
    .cluster-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      font-size: 12px;
      padding: 2px 0;
    }
    .cluster-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .cluster-name {
      flex: 1;
      color: var(--pages-text-primary, #212529);
    }
    .cluster-replicas {
      color: var(--pages-text-secondary, #6c757d);
      font-variant-numeric: tabular-nums;
    }
    .empty {
      color: var(--pages-neutral-9, #888);
      font-style: italic;
      padding: var(--pages-space-4, 1rem);
    }
  `;

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('endpoint') && this.endpoint && !this.data) {
      this._fetchFromEndpoint();
    }
  }

  private async _fetchFromEndpoint(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const resp = await fetch(this.endpoint);
      if (resp.ok) {
        this._fetchedData = await resp.json() as ServiceCardData;
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): ServiceCardData | null {
    return this.data ?? this._fetchedData;
  }

  private _handleClick(): void {
    const d = this._effectiveData;
    if (d) {
      emitPagesEvent(this, ServiceCardTopics.SELECTED, {
        serviceId: d.serviceId,
        serviceName: d.serviceName,
      });
    }
  }

  private _renderCluster(c: ClusterDeploymentStatus) {
    const color = (CLUSTER_STATUS_COLORS[c.status] ?? CLUSTER_STATUS_COLORS.unknown)!;
    return html`
      <div class="cluster-row">
        <span class="cluster-dot" style="background: ${color};"></span>
        <span class="cluster-name">${c.clusterName}</span>
        <span class="cluster-replicas">${c.readyReplicas}/${c.desiredReplicas}</span>
      </div>
    `;
  }

  override render() {
    if (this._loading) return html`<div class="empty">Loading service data...</div>`;
    const d = this._effectiveData;
    if (!d) return html`<div class="empty">No service data</div>`;

    const colors = (STATUS_COLORS[d.status] ?? STATUS_COLORS.ABSENT)!;

    return html`
      <div class="card" @click=${this._handleClick} role="button" tabindex="0"
           aria-label="${d.serviceName} — ${d.status}">
        <div class="header">
          <span class="service-name">${d.serviceName}</span>
          <span class="status-badge"
                style="background: ${colors.bg}; color: ${colors.fg};">${d.status}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Image</span>
          <span>${d.image}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Replicas</span>
          <span>${d.replicas}</span>
        </div>
        <div class="clusters">
          ${d.clusters.length > 0
            ? d.clusters.map(c => this._renderCluster(c))
            : html`<div class="empty" style="padding: 4px 0;">No cluster data</div>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-service-card': ServiceCard;
  }
}
