import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { timerSubscribe, timerUnsubscribe } from '@casehubio/pages-component';
import { emitPagesEvent } from '@casehubio/pages-data';

export const SlaIndicatorTopics = {
  STATE_CHANGED: 'sla.state-changed',
} as const;

type SlaState = 'normal' | 'warning' | 'critical' | 'breached';

const ABSOLUTE_WARNING_MS = 3600000;
const ABSOLUTE_CRITICAL_MS = 900000;

function formatCountdown(ms: number): string {
  if (ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatBreach(ms: number): string {
  const elapsed = Math.abs(ms);
  const totalMinutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `Breached ${days}d ago`;
  if (hours > 0) return `Breached ${hours}h ago`;
  return `Breached ${totalMinutes}m ago`;
}

function formatAriaLabel(ms: number): string {
  if (ms <= 0) {
    const elapsed = Math.abs(ms);
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    if (hours > 0) return `Deadline breached ${hours} hours ${minutes} minutes ago`;
    return `Deadline breached ${minutes} minutes ago`;
  }
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  return `${parts.join(' ')} remaining`;
}

export interface SlaIndicatorProps {
  deadline: string;
  slaWindow: number | null;
  warningThreshold: number;
  criticalThreshold: number;
  escalationStage: string | null;
  compact: boolean;
}

@customElement('agency-sla-indicator')
export class SlaIndicator extends LitElement {
  @property({ type: String }) deadline = '';
  @property({ type: Number, attribute: 'sla-window' }) slaWindow: number | null = null;
  @property({ type: Number, attribute: 'warning-threshold' }) warningThreshold = 0.25;
  @property({ type: Number, attribute: 'critical-threshold' }) criticalThreshold = 0.10;
  @property({ type: String, attribute: 'escalation-stage' }) escalationStage: string | null = null;
  @property({ type: Boolean }) compact = true;

  @state() private _remaining = 0;
  @state() private _state: SlaState = 'normal';
  @state() private _deadlineValid = true;

  private _lastEmittedState: SlaState | null = null;

  static override styles = css`
    :host { display: inline-flex; align-items: center; }

    .sla-indicator {
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-1-5, 6px);
      font-family: var(--pages-font-family, system-ui);
      font-variant-numeric: tabular-nums;
    }

    .countdown {
      font-weight: var(--pages-font-weight-medium, 500);
    }

    .compact .countdown { font-size: var(--pages-font-size-sm, 12px); }
    .expanded .countdown { font-size: var(--pages-font-size-base, 14px); }

    .normal .countdown { color: var(--pages-success-9, #16a34a); }
    .warning .countdown { color: var(--pages-warning-9, #d97706); }
    .critical .countdown { color: var(--pages-danger-9, #dc2626); }
    .breached .countdown {
      color: var(--pages-danger-9, #dc2626);
      animation: pulse 2s ease-in-out infinite;
    }

    .escalation-badge {
      font-size: var(--pages-font-size-xs, 11px);
      padding: 1px var(--pages-space-1-5, 6px);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-danger-9, #dc2626);
      font-weight: var(--pages-font-weight-medium, 500);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    @media (prefers-reduced-motion: reduce) {
      .breached .countdown { animation: none; }
    }
  `;

  private _tick = (): void => {
    this._update();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    timerSubscribe(this._tick);
    this._update();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    timerUnsubscribe(this._tick);
    this._lastEmittedState = null;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('deadline') || changed.has('slaWindow') ||
        changed.has('warningThreshold') || changed.has('criticalThreshold')) {
      this._lastEmittedState = null;
      this._update();
    }
  }

  private _update(): void {
    if (!this.deadline) return;
    const deadlineMs = new Date(this.deadline).getTime();
    if (isNaN(deadlineMs)) {
      if (this._deadlineValid) {
        console.warn(`sla-indicator: invalid deadline value "${this.deadline}"`);
      }
      this._deadlineValid = false;
      this._remaining = 0;
      this._state = 'normal';
      return;
    }
    this._deadlineValid = true;
    this._remaining = deadlineMs - Date.now();
    this._state = this._computeState();

    if (this._state !== this._lastEmittedState) {
      this._lastEmittedState = this._state;
      emitPagesEvent(this, SlaIndicatorTopics.STATE_CHANGED, {
        state: this._state,
        deadline: this.deadline,
      });
    }
  }

  private _computeState(): SlaState {
    if (this._remaining <= 0) return 'breached';

    if (this.slaWindow !== null && this.slaWindow > 0) {
      const fraction = this._remaining / this.slaWindow;
      if (fraction <= this.criticalThreshold) return 'critical';
      if (fraction <= this.warningThreshold) return 'warning';
      return 'normal';
    }

    if (this._remaining <= ABSOLUTE_CRITICAL_MS) return 'critical';
    if (this._remaining <= ABSOLUTE_WARNING_MS) return 'warning';
    return 'normal';
  }

  override render() {
    if (!this.deadline || !this._deadlineValid) return nothing;
    const text = this._remaining > 0
      ? formatCountdown(this._remaining)
      : formatBreach(this._remaining);
    const modeClass = this.compact ? 'compact' : 'expanded';
    const tooltipDate = new Date(this.deadline);
    const tooltip = `Deadline: ${tooltipDate.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`;

    return html`
      <span
        class="sla-indicator ${this._state} ${modeClass}"
        role="timer"
        aria-label="${formatAriaLabel(this._remaining)}"
        title="${tooltip}"
      >
        <span class="countdown">${text}</span>
        ${this.escalationStage
          ? html`<span class="escalation-badge">${this.escalationStage}</span>`
          : nothing}
      </span>
    `;
  }

  configure(props: {
    deadline?: string;
    slaWindow?: number | null;
    warningThreshold?: number;
    criticalThreshold?: number;
    escalationStage?: string | null;
    compact?: boolean;
  }): void {
    if (props.deadline !== undefined) this.deadline = props.deadline;
    if (props.slaWindow !== undefined) this.slaWindow = props.slaWindow;
    if (props.warningThreshold !== undefined) this.warningThreshold = props.warningThreshold;
    if (props.criticalThreshold !== undefined) this.criticalThreshold = props.criticalThreshold;
    if (props.escalationStage !== undefined) this.escalationStage = props.escalationStage;
    if (props.compact !== undefined) this.compact = props.compact;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-sla-indicator': SlaIndicator;
  }
}
