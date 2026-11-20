import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import type { ContextUsagePayload } from './types.js';

@customElement('context-gauge')
export class ContextGauge extends LitElement {
  @state() private _pct = 0;
  @state() private _visible = false;
  @state() private _thresholdExceeded = false;
  @state() private _tooltipText = '';

  private _windowSizeChars: number | null = null;
  private _cleanups: (() => void)[] = [];

  configure(_props: Record<string, unknown>): void {}

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'meter');
    this.setAttribute('aria-label', 'Context usage');
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', '100');
    this.setAttribute('aria-valuenow', '0');
    this._cleanups.push(
      onPagesEvent<ContextUsagePayload>(document, 'context-usage', (payload) => {
        this._handleMeta(payload);
      }),
      onPagesEvent(document, 'reconnected', () => {
        this._reset();
      }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
  }

  private _handleMeta(data: ContextUsagePayload): void {
    if (data.windowSizeChars != null) this._windowSizeChars = data.windowSizeChars;
    this._visible = true;
    this._pct = data.effectivePercent;
    this.setAttribute('aria-valuenow', String(Math.round(data.effectivePercent)));
    this._thresholdExceeded = data.thresholdExceeded ?? false;
    const contribK = Math.round((data.serverContributionChars || 0) / 1000);
    const windowK = this._windowSizeChars ? Math.round(this._windowSizeChars / 1000) : '?';
    const agentStr = data.agentReportedPercent != null ? Math.round(data.agentReportedPercent) + '%' : '—';
    this._tooltipText = `Server contribution: ${contribK}k / ${windowK}k chars (${data.messageCount || 0} messages). Agent-reported: ${agentStr}`;
  }

  private _reset(): void {
    this._visible = false;
    this._windowSizeChars = null;
    this._pct = 0;
    this._thresholdExceeded = false;
    this._tooltipText = '';
    this.setAttribute('aria-valuenow', '0');
  }

  static override styles = css`
    :host { display: none; align-items: center; gap: 6px; font-size: 11px; color: var(--sepia, var(--pages-neutral-11, #6b7280)); }
    :host([visible]) { display: flex; }
    .gauge-label { white-space: nowrap; font-weight: 600; }
    .gauge-bar { width: 80px; height: 8px; background: var(--pages-neutral-4, #e5e7eb); border-radius: 2px; overflow: hidden; }
    .gauge-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background-color 0.3s ease; }
    .fill-normal { background: var(--pages-accent-9, #6366f1); }
    .fill-warn { background: var(--pages-warning-9, #d97706); }
    .fill-error { background: var(--pages-error-9, #dc2626); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .threshold-exceeded .gauge-label { animation: pulse 2s ease-in-out infinite; color: var(--pages-error-9, #dc2626); }
  `;

  override render() {
    const clamped = Math.min(this._pct, 100);
    const fillClass = this._pct >= 80 ? 'fill-error' : this._pct >= 60 ? 'fill-warn' : 'fill-normal';
    return html`
      <div class=${this._thresholdExceeded ? 'threshold-exceeded' : ''} title=${this._tooltipText}>
        <span class="gauge-label">Ctx: ${this._visible ? Math.round(this._pct) + '%' : '—'}</span>
      </div>
      <div class="gauge-bar">
        <div class="gauge-fill ${fillClass}" style="width:${clamped}%"></div>
      </div>
    `;
  }

  override updated(): void {
    this.toggleAttribute('visible', this._visible);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'context-gauge': ContextGauge;
  }
}
