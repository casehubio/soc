import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ClusterInfo } from './types.js';

export const ClusterPanelTopics = {
  REGISTERED: 'cluster.registered',
  DELETED: 'cluster.deleted',
  TESTED: 'cluster.tested',
} as const;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  CONNECTED: { bg: 'var(--pages-success-3, #d4edda)', fg: 'var(--pages-success-11, #155724)' },
  UNREACHABLE: { bg: 'var(--pages-danger-3, #f8d7da)', fg: 'var(--pages-danger-11, #721c24)' },
  UNKNOWN: { bg: 'var(--pages-neutral-3, #e9ecef)', fg: 'var(--pages-neutral-11, #495057)' },
};

export interface ClusterPanelProps {
  data: ClusterInfo[] | null;
  endpoint?: string;
  readonly: boolean;
}

@customElement('agency-cluster-panel')
export class ClusterPanel extends LitElement {
  @property({ attribute: false }) data: ClusterInfo[] | null = null;
  @property() endpoint?: string;
  @property({ type: Boolean }) readonly = false;

  @state() private _fetchedData: ClusterInfo[] | null = null;
  @state() private _loading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Cluster management');
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .cluster-list { display: flex; flex-direction: column; gap: var(--pages-space-2, 0.5rem); }
    .cluster-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-3, 0.75rem);
      padding: var(--pages-space-3, 0.75rem);
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-2, 4px);
    }
    .cluster-info { flex: 1; }
    .cluster-name { font-weight: 600; font-size: 14px; color: var(--pages-text-primary, #212529); }
    .cluster-meta { font-size: 12px; color: var(--pages-text-secondary, #6c757d); margin-top: 2px; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--pages-radius-2, 4px);
      font-weight: 600;
      font-size: 11px;
    }
    .type-badge {
      font-size: 11px;
      color: var(--pages-text-secondary, #6c757d);
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      padding: 1px 6px;
      border-radius: var(--pages-radius-1, 2px);
    }
    .actions { display: flex; gap: var(--pages-space-1, 0.25rem); }
    .action-btn {
      background: none;
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-2, 4px);
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      color: var(--pages-text-secondary, #6c757d);
    }
    .action-btn:hover { background: var(--pages-neutral-3, #e9ecef); }
    .delete-btn:hover { background: var(--pages-danger-3, #f8d7da); color: var(--pages-danger-11, #721c24); }
    .registration-form {
      margin-top: var(--pages-space-4, 1rem);
      padding: var(--pages-space-4, 1rem);
      border: 1px dashed var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-3, 8px);
    }
    .form-title { font-weight: 600; font-size: 14px; margin-bottom: var(--pages-space-3, 0.75rem); }
    .form-row {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      margin-bottom: var(--pages-space-2, 0.5rem);
      align-items: center;
    }
    .form-row label { font-size: 12px; min-width: 80px; color: var(--pages-text-secondary, #6c757d); }
    .form-row input, .form-row select {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 13px;
    }
    .submit-btn {
      background: var(--pages-accent-9, #3b82f6);
      color: white;
      border: none;
      border-radius: var(--pages-radius-2, 4px);
      padding: 6px 16px;
      font-size: 13px;
      cursor: pointer;
      margin-top: var(--pages-space-2, 0.5rem);
    }
    .submit-btn:hover { opacity: 0.9; }
    .empty { color: var(--pages-neutral-9, #888); font-style: italic; padding: var(--pages-space-4, 1rem); }
  `;

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('readonly')) {
      this.setAttribute('aria-disabled', String(this.readonly));
    }
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
        this._fetchedData = await resp.json() as ClusterInfo[];
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): ClusterInfo[] | null {
    return this.data ?? this._fetchedData;
  }

  private _handleDelete(cluster: ClusterInfo): void {
    emitPagesEvent(this, ClusterPanelTopics.DELETED, { clusterId: cluster.id, clusterName: cluster.name });
  }

  private _handleTest(cluster: ClusterInfo): void {
    emitPagesEvent(this, ClusterPanelTopics.TESTED, { clusterId: cluster.id, clusterName: cluster.name });
  }

  private _handleSubmit(e: Event): void {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    emitPagesEvent(this, ClusterPanelTopics.REGISTERED, {
      name: formData.get('name') as string,
      apiUrl: formData.get('apiUrl') as string,
      namespace: formData.get('namespace') as string,
      type: formData.get('type') as string,
    });
  }

  private _renderCluster(cluster: ClusterInfo) {
    const colors = (STATUS_COLORS[cluster.status] ?? STATUS_COLORS.UNKNOWN)!;
    return html`
      <div class="cluster-row">
        <div class="cluster-info">
          <div class="cluster-name">${cluster.name}</div>
          <div class="cluster-meta">${cluster.apiUrl} · ${cluster.namespace} · ${cluster.applicationCount} apps</div>
        </div>
        <span class="type-badge">${cluster.type}</span>
        <span class="status-badge" style="background: ${colors.bg}; color: ${colors.fg};">${cluster.status}</span>
        <div class="actions">
          <button class="action-btn test-btn" @click=${() => this._handleTest(cluster)}>Test</button>
          ${!this.readonly ? html`<button class="action-btn delete-btn" @click=${() => this._handleDelete(cluster)}>Delete</button>` : ''}
        </div>
      </div>
    `;
  }

  private _renderForm() {
    if (this.readonly) return '';
    return html`
      <form class="registration-form" @submit=${this._handleSubmit}>
        <div class="form-title">Register Cluster</div>
        <div class="form-row">
          <label for="cluster-name">Name</label>
          <input name="name" id="cluster-name" required placeholder="e.g. prod-eu">
        </div>
        <div class="form-row">
          <label for="cluster-apiUrl">API URL</label>
          <input name="apiUrl" id="cluster-apiUrl" required placeholder="https://k8s.example.com">
        </div>
        <div class="form-row">
          <label for="cluster-namespace">Namespace</label>
          <input name="namespace" id="cluster-namespace" required placeholder="default">
        </div>
        <div class="form-row">
          <label for="cluster-type">Type</label>
          <select name="type" id="cluster-type">
            <option value="KUBERNETES">Kubernetes</option>
            <option value="OPENSHIFT">OpenShift</option>
          </select>
        </div>
        <button type="submit" class="submit-btn">Register</button>
      </form>
    `;
  }

  override render() {
    this.setAttribute('aria-busy', String(this._loading));
    if (this._loading) return html`<div class="empty">Loading clusters...</div>`;
    const clusters = this._effectiveData;

    return html`
      <div class="cluster-list">
        ${clusters && clusters.length > 0
          ? clusters.map(c => this._renderCluster(c))
          : html`<div class="empty">No clusters registered</div>`}
      </div>
      ${this._renderForm()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-cluster-panel': ClusterPanel;
  }
}
