import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DagDispatchMode } from '@casehubio/mosaic-graph-stencil-htn';

@customElement('agency-dag-toolbar')
export class AgencyDagToolbar extends LitElement {
  @property({ type: String }) dispatchMode: DagDispatchMode | null = null;
  @property({ type: Number }) nodeCount = 0;
  @property({ type: Number }) completedCount = 0;
  @property({ type: Number }) runningCount = 0;
  @property({ type: Number }) failedCount = 0;
  @property({ type: String }) elapsed: string | null = null;
  @property({ type: String }) resultTimestamp: string | null = null;

  @state() private _staleSeconds = 0;
  private _staleTimer: ReturnType<typeof setInterval> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'DAG execution status');
    this.setAttribute('aria-live', 'polite');
    this._startStaleTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopStaleTimer();
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('resultTimestamp')) {
      if (this.resultTimestamp != null) this._startStaleTimer();
      else this._stopStaleTimer();
    }
  }

  private _startStaleTimer(): void {
    this._stopStaleTimer();
    if (this.resultTimestamp == null) return;
    this._updateStaleness();
    this._staleTimer = setInterval(() => this._updateStaleness(), 1000);
  }

  private _stopStaleTimer(): void {
    if (this._staleTimer != null) {
      clearInterval(this._staleTimer);
      this._staleTimer = null;
    }
    this._staleSeconds = 0;
  }

  private _updateStaleness(): void {
    if (this.resultTimestamp == null) { this._staleSeconds = 0; return; }
    this._staleSeconds = this._computeStaleness(this.resultTimestamp);
  }

  _computeStaleness(ts: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  }

  static override styles = css`
    :host { display: flex; align-items: center; gap: 12px; padding: 6px 12px;
      font-family: var(--pages-font-family, sans-serif); font-size: 13px;
      border-bottom: 1px solid var(--pages-border-color, #e5e7eb); }
    .pill { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .dispatch { background: var(--pages-accent-subtle, #e8f0fe); color: var(--pages-accent-color, #1a73e8); }
    .stat { color: var(--pages-text-secondary, #666); }
    .stale { color: #eab308; }
  `;

  override render() {
    return html`
      ${this.dispatchMode ? html`<span class="pill dispatch">${this.dispatchMode}</span>` : ''}
      <span class="stat">${this.nodeCount} nodes</span>
      ${this.completedCount > 0 ? html`<span class="stat">✓ ${this.completedCount}</span>` : ''}
      ${this.runningCount > 0 ? html`<span class="stat">▶ ${this.runningCount}</span>` : ''}
      ${this.failedCount > 0 ? html`<span class="stat" style="color: #ef4444;">! ${this.failedCount}</span>` : ''}
      ${this.elapsed ? html`<span class="stat">${this.elapsed}</span>` : ''}
      ${this._staleSeconds > 30 ? html`<span class="stale">⚠ stale (${this._staleSeconds}s ago)</span>` : ''}
    `;
  }
}
