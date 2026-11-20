import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { DimensionDashboardData, DimensionView, DimensionSeverity } from './types.js';

export const DimensionDashboardTopics = {
  SELECTED: 'dimension.selected',
} as const;

const SEVERITY_COLORS: Record<DimensionSeverity, { bg: string; fg: string }> = {
  OK: { bg: 'var(--pages-success-3, #d4edda)', fg: 'var(--pages-success-11, #155724)' },
  LOW: { bg: 'var(--pages-accent-3, #dbeafe)', fg: 'var(--pages-accent-11, #1e40af)' },
  MEDIUM: { bg: 'var(--pages-warning-3, #fff3cd)', fg: 'var(--pages-warning-11, #856404)' },
  HIGH: { bg: 'var(--pages-orange-3, #ffe5d0)', fg: 'var(--pages-orange-11, #8a4000)' },
  CRITICAL: { bg: 'var(--pages-danger-3, #f8d7da)', fg: 'var(--pages-danger-11, #721c24)' },
};

export interface DimensionDashboardProps {
  data: DimensionDashboardData | null;
  endpoint?: string;
  compact: boolean;
}

@customElement('agency-dimension-dashboard')
export class DimensionDashboard extends LitElement {
  @property({ attribute: false }) data: DimensionDashboardData | null = null;
  @property() endpoint?: string;
  @property({ type: Boolean }) compact = false;

  @state() private _fetchedData: DimensionDashboardData | null = null;
  @state() private _loading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Dimension status');
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .service-name { font-weight: 600; font-size: 16px; color: var(--pages-text-primary, #212529); }
    .overall-health {
      font-size: 13px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: var(--pages-radius-2, 4px);
    }
    .dimensions {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--pages-space-3, 0.75rem);
    }
    .dimensions.compact {
      grid-template-columns: 1fr;
      gap: var(--pages-space-1, 0.25rem);
    }
    .dimension-card {
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-3, 0.75rem);
      cursor: pointer;
      transition: box-shadow 0.15s ease;
    }
    .dimension-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .compact .dimension-card {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      padding: var(--pages-space-2, 0.5rem);
      border-radius: var(--pages-radius-2, 4px);
    }
    .dim-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--pages-space-2, 0.5rem);
    }
    .compact .dim-header { margin-bottom: 0; flex: 1; }
    .dim-label { font-weight: 600; font-size: 14px; color: var(--pages-text-primary, #212529); }
    .compact .dim-label { font-size: 13px; }
    .severity-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: var(--pages-radius-2, 4px);
      font-weight: 600;
      font-size: 11px;
    }
    .dim-status {
      font-size: 13px;
      color: var(--pages-text-secondary, #6c757d);
    }
    .dim-responses {
      font-size: 12px;
      color: var(--pages-text-secondary, #6c757d);
      margin-top: var(--pages-space-1, 0.25rem);
    }
    .compact .dim-status, .compact .dim-responses { font-size: 12px; }
    .empty { color: var(--pages-neutral-9, #888); font-style: italic; padding: var(--pages-space-4, 1rem); }
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
        this._fetchedData = await resp.json() as DimensionDashboardData;
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): DimensionDashboardData | null {
    return this.data ?? this._fetchedData;
  }

  private _handleDimensionClick(dim: DimensionView): void {
    emitPagesEvent(this, DimensionDashboardTopics.SELECTED, {
      type: dim.type,
      label: dim.label,
      status: dim.status,
      severity: dim.severity,
    });
  }

  private _renderDimension(dim: DimensionView) {
    const colors = SEVERITY_COLORS[dim.severity] ?? SEVERITY_COLORS.OK;
    return html`
      <div class="dimension-card" @click=${() => this._handleDimensionClick(dim)}>
        <div class="dim-header">
          <span class="dim-label">${dim.label}</span>
          <span class="severity-badge"
                style="background: ${colors.bg}; color: ${colors.fg};">${dim.severity}</span>
        </div>
        <div class="dim-status">${dim.status}</div>
        ${dim.activeResponses > 0
          ? html`<div class="dim-responses">${dim.activeResponses} active response${dim.activeResponses > 1 ? 's' : ''}</div>`
          : ''}
      </div>
    `;
  }

  override render() {
    this.setAttribute('aria-busy', String(this._loading));
    if (this._loading) return html`<div class="empty">Loading dimension data...</div>`;
    const d = this._effectiveData;
    if (!d) return html`<div class="empty">No dimension data</div>`;

    return html`
      <div class="header">
        <span class="service-name">${d.serviceName}</span>
        <span class="overall-health">${d.overallHealth}</span>
      </div>
      ${d.dimensions.length > 0
        ? html`<div class="dimensions ${this.compact ? 'compact' : ''}">
            ${d.dimensions.map(dim => this._renderDimension(dim))}
          </div>`
        : html`<div class="empty">No dimensions configured</div>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-dimension-dashboard': DimensionDashboard;
  }
}
