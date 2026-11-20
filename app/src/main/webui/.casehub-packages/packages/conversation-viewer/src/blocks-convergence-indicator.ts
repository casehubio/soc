import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { ConvergenceSignal, ConvergenceState } from './types.js';
import { pulseAnimation } from '@casehubio/pages-ui-tokens';

const STATE_COLOURS: Record<ConvergenceState, string> = {
  PROGRESSING: 'var(--pages-neutral-8, #9ca3af)',
  CONVERGING: 'var(--pages-accent-9, #6366f1)',
  CONSENSUS: 'var(--pages-success-9, #16a34a)',
  DEADLOCK: 'var(--pages-error-9, #dc2626)',
  DIMINISHING_RETURNS: 'var(--pages-warning-9, #d97706)',
};

const TERMINAL_STATES: ReadonlySet<ConvergenceState> = new Set(['CONSENSUS', 'DEADLOCK']);

export interface ConvergenceIndicatorProps {
  signal?: ConvergenceSignal;
  size: 'sm' | 'md';
}

@customElement('blocks-convergence-indicator')
export class ConvergenceIndicator extends LitElement {
  @property({ attribute: false }) signal?: ConvergenceSignal;
  @property({ type: String }) size: 'sm' | 'md' = 'md';

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Convergence status');
    this.setAttribute('aria-live', 'polite');
  }

  static override styles = [
    pulseAnimation,
    css`
      :host { display: block; }
      .container { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
      .state-label {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: var(--pages-neutral-11, #6b7280);
        white-space: nowrap;
      }
      .bar-track {
        flex: 1; height: 6px; border-radius: var(--pages-radius-sm, 3px);
        background: var(--pages-neutral-3, #e5e7eb); overflow: hidden;
      }
      .bar-fill {
        height: 100%; border-radius: var(--pages-radius-sm, 3px);
        transition: width 0.3s ease;
      }
      .pulse { animation: pulse 2s infinite; }
      .percentage {
        font-size: 11px; font-weight: 600;
        color: var(--pages-neutral-9, #9ca3af); min-width: 32px; text-align: right;
      }
    `,
  ];

  override render() {
    if (!this.signal) return nothing;
    const { state, confidence, reason } = this.signal;
    const clamped = Math.max(0, Math.min(1, confidence || 0));
    const colour = STATE_COLOURS[state] ?? STATE_COLOURS.PROGRESSING;
    const pct = Math.round(clamped * 100);
    const isPulse = TERMINAL_STATES.has(state);

    return html`
      <div class="container">
        ${this.size === 'md' ? html`<span class="state-label">${state.replace(/_/g, ' ')}</span>` : nothing}
        <div class="bar-track">
          <div
            class="bar-fill ${isPulse ? 'pulse' : ''}"
            style=${styleMap({ width: `${pct}%`, background: colour })}
            title=${reason}
          ></div>
        </div>
        <span class="percentage">${pct}%</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-convergence-indicator': ConvergenceIndicator;
  }
}
