import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import type { WorkspaceProgressPayload, PipelineProgressPayload } from './types.js';

@customElement('workspace-status')
export class WorkspaceStatus extends LitElement {
  @state() private _visible = false;
  @state() private _text = '';
  @state() private _elapsed = 0;
  @state() private _terminal = false;

  private _cleanups: (() => void)[] = [];
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _currentAgent = '';

  configure(_props: Record<string, unknown>): void {}

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Workspace status');
    this.setAttribute('aria-live', 'polite');
    this._cleanups.push(
      onPagesEvent<WorkspaceProgressPayload>(document, 'workspace-progress', (p) => {
        this._handleProgress(p);
      }),
      onPagesEvent<PipelineProgressPayload>(document, 'pipeline-progress', (p) => {
        this._handlePipelineProgress(p);
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
    this._stopTimer();
  }

  private _handleProgress(p: WorkspaceProgressPayload): void {
    this._visible = true;
    switch (p.type) {
      case 'AGENT_START':
        this._currentAgent = p.agent ?? '';
        this._elapsed = 0;
        this._terminal = false;
        this._text = `${this._currentAgent}${p.cached ? ' (cached)' : ''}...`;
        this._startTimer();
        break;
      case 'AGENT_STATUS':
        this._currentAgent = p.agent ?? this._currentAgent;
        this._elapsed = p.elapsed ?? this._elapsed;
        this._text = `${this._currentAgent}: ${p.message ?? ''}`;
        break;
      case 'AGENT_COMPLETE':
        this._stopTimer();
        this._text = `${p.agent ?? this._currentAgent} done ($${(p.cost ?? 0).toFixed(2)})`;
        break;
      case 'ISSUES_RAISED':
        this._text += ` — ${p.count} issue(s) raised`;
        break;
      case 'ROUND_COMPLETE':
        this._stopTimer();
        this._text = `Round ${p.round} complete — $${(p.cumulativeCost ?? 0).toFixed(2)} cumulative`;
        break;
      case 'REVIEW_TERMINAL':
        this._stopTimer();
        this._terminal = true;
        this._text = `Review ${(p.finalState ?? 'DONE').toLowerCase()}`;
        break;
    }
  }

  private _startTimer(): void {
    this._stopTimer();
    this._timer = setInterval(() => { this._elapsed++; this.requestUpdate(); }, 1000);
  }

  private _stopTimer(): void {
    if (this._timer !== null) { clearInterval(this._timer); this._timer = null; }
  }

  private _handlePipelineProgress(p: PipelineProgressPayload): void {
    this._visible = true;
    this._terminal = p.phase === 'COMPLETE';
    const running = p.dimensions.filter(d => d.status === 'RUNNING').length;
    const total = p.dimensions.length;
    if (p.checkpointStatus === 'PENDING') {
      this._text = 'Pipeline: checkpoint pending';
    } else if (this._terminal) {
      this._text = 'Pipeline: complete';
    } else {
      this._text = `Pipeline: ${running}/${total} dimensions running`;
    }
    this._stopTimer();
  }

  private _reset(): void {
    this._visible = false;
    this._text = '';
    this._elapsed = 0;
    this._terminal = false;
    this._stopTimer();
  }

  private _formatElapsed(): string {
    const m = Math.floor(this._elapsed / 60);
    const s = this._elapsed % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  static override styles = css`
    :host { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pages-neutral-8, #9ca3af); }
    :host([hidden]) { display: none; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pages-accent-9, #6366f1); animation: pulse 1.5s ease-in-out infinite; }
    .dot.terminal { animation: none; background: var(--pages-success-9, #16a34a); }
    .dot.failed { animation: none; background: var(--pages-error-9, #dc2626); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .elapsed { font-variant-numeric: tabular-nums; }
  `;

  override render() {
    if (!this._visible) return html``;
    const dotClass = this._terminal
      ? (this._text.includes('failed') || this._text.includes('crashed') ? 'dot failed' : 'dot terminal')
      : 'dot';
    return html`
      <span class="${dotClass}"></span>
      <span>${this._text}</span>
      ${this._timer !== null ? html`<span class="elapsed">(${this._formatElapsed()})</span>` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'workspace-status': WorkspaceStatus;
  }
}
