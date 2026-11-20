import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { GateDecision } from './types.js';

export interface TrustFeedbackDisplayProps {
  gateDecision: GateDecision | null;
  compact: boolean;
}

@customElement('agency-trust-feedback-display')
export class TrustFeedbackDisplay extends LitElement {
  @property({ attribute: false }) gateDecision: GateDecision | null = null;
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .card {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      background: var(--pages-neutral-1, #fff);
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: var(--pages-space-2, 0.5rem) 0;
      border-bottom: 1px solid var(--pages-neutral-3, #f0f0f0);
    }
    .row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: var(--pages-neutral-11, #555); font-size: 13px; }
    .value { color: var(--pages-neutral-12, #111); font-size: 13px; }
    .decision-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: var(--pages-radius-2, 4px);
      font-weight: 600;
      font-size: 13px;
    }
    .decision-badge--approved { background: var(--pages-success-3, #d4edda); color: var(--pages-success-11, #155724); }
    .decision-badge--rejected { background: var(--pages-danger-3, #f8d7da); color: var(--pages-danger-11, #721c24); }
    .attestation-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: var(--pages-radius-2, 4px);
      font-size: 13px;
    }
    .attestation-badge--endorsed { background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af); }
    .attestation-badge--overruled { background: var(--pages-orange-3, #ffe5d0); color: var(--pages-orange-11, #8a4000); }
    .trust-delta { display: flex; align-items: center; gap: var(--pages-space-2, 0.5rem); }
    .arrow { font-weight: bold; font-size: 16px; }
    .arrow--up { color: var(--pages-success-9, #16a34a); }
    .arrow--down { color: var(--pages-danger-9, #dc2626); }
    .arrow--neutral { color: var(--pages-neutral-9, #888); }
    .compact {
      display: flex;
      align-items: center;
      gap: var(--pages-space-3, 0.75rem);
      font-size: 13px;
      padding: var(--pages-space-2, 0.5rem);
    }
    .no-data { color: var(--pages-neutral-9, #888); padding: var(--pages-space-4, 1rem); }
  `;

  private _getDecisionClass(decision: string): string {
    return decision === 'APPROVED' ? 'decision-badge--approved' : 'decision-badge--rejected';
  }

  private _getAttestationClass(attestation: string): string {
    return attestation === 'ENDORSED' ? 'attestation-badge--endorsed' : 'attestation-badge--overruled';
  }

  private _getTrustArrow(before: number, after: number): { symbol: string; className: string } {
    if (after > before) return { symbol: '↑', className: 'arrow--up' };
    if (after < before) return { symbol: '↓', className: 'arrow--down' };
    return { symbol: '→', className: 'arrow--neutral' };
  }

  override render() {
    if (!this.gateDecision) {
      return html`<div class="no-data">No gate decision data</div>`;
    }

    const { decision, actor, attestation, trustScoreBefore, trustScoreAfter, dimension } = this.gateDecision;
    const arrow = this._getTrustArrow(trustScoreBefore, trustScoreAfter);

    if (this.compact) {
      return html`
        <div class="compact">
          <span class="decision-badge ${this._getDecisionClass(decision)}">${decision}</span>
          <span>${actor}</span>
          <span class="attestation-badge ${this._getAttestationClass(attestation)}">${attestation}</span>
          <span class="trust-delta">
            ${trustScoreBefore.toFixed(2)}
            <span class="arrow ${arrow.className}">${arrow.symbol}</span>
            ${trustScoreAfter.toFixed(2)}
          </span>
          <span style="color: var(--pages-neutral-9, #888);">${dimension}</span>
        </div>
      `;
    }

    return html`
      <div class="card" role="region" aria-label="Gate decision">
        <div class="row">
          <span class="label">Gate Decision</span>
          <span class="value">
            <span class="decision-badge ${this._getDecisionClass(decision)}">${decision}</span>
          </span>
        </div>
        <div class="row">
          <span class="label">Actor</span>
          <span class="value">${actor}</span>
        </div>
        <div class="row">
          <span class="label">Attestation Verdict</span>
          <span class="value">
            <span class="attestation-badge ${this._getAttestationClass(attestation)}">${attestation}</span>
          </span>
        </div>
        <div class="row">
          <span class="label">Trust Score Delta</span>
          <span class="value">
            <span class="trust-delta">
              ${trustScoreBefore.toFixed(2)}
              <span class="arrow ${arrow.className}">${arrow.symbol}</span>
              ${trustScoreAfter.toFixed(2)}
            </span>
          </span>
        </div>
        <div class="row">
          <span class="label">Dimension</span>
          <span class="value">${dimension}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-trust-feedback-display': TrustFeedbackDisplay;
  }
}
