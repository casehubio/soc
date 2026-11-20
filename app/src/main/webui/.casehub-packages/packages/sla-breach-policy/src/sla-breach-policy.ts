import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { pulseAnimation } from '@casehubio/pages-ui-tokens';
import '@casehubio/mosaic-sla-indicator';
import type { TierDefinition } from './types.js';

export interface SlaBreachPolicyProps {
  tiers: TierDefinition[];
  timeRemaining: number;
  deadline: string;
}

@customElement('agency-sla-breach-policy')
export class SlaBreachPolicy extends LitElement {
  @property({ attribute: false }) tiers: TierDefinition[] = [];
  @property({ type: Number, attribute: 'time-remaining' }) timeRemaining = 0;
  @property({ type: String }) deadline = '';

  static override styles = [
    pulseAnimation,
    css`
      :host { display: block; font-family: var(--pages-font-family, system-ui); }
      .empty { color: var(--pages-neutral-9, #888); font-style: italic; padding: var(--pages-space-4, 1rem); }
      .header { display: flex; align-items: center; gap: var(--pages-space-3, 0.75rem); margin-bottom: var(--pages-space-4, 1rem); }
      .tier-list { display: flex; flex-direction: column; gap: var(--pages-space-3, 0.75rem); }
      .tier {
        display: flex;
        align-items: flex-start;
        gap: var(--pages-space-3, 0.75rem);
        padding: var(--pages-space-3, 0.75rem);
        border-radius: var(--pages-radius-2, 4px);
        border: 2px solid var(--pages-neutral-4, #e5e5e5);
        background: var(--pages-neutral-1, #fff);
        transition: all 0.2s ease;
      }
      .tier--active {
        border-color: var(--pages-orange-9, #ea580c);
        background: var(--pages-orange-3, rgba(255, 247, 237, 0.15));
        box-shadow: 0 2px 8px var(--pages-orange-5, rgba(234, 88, 12, 0.15));
      }
      .tier-node {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 13px;
        background: var(--pages-neutral-5, #d4d4d4);
        color: var(--pages-neutral-11, #555);
      }
      .tier--active .tier-node {
        background: var(--pages-orange-9, #ea580c);
        color: white;
        animation: pulse 2s infinite;
      }
      .tier-content { flex: 1; }
      .tier-header {
        display: flex;
        align-items: center;
        gap: var(--pages-space-2, 0.5rem);
        margin-bottom: var(--pages-space-2, 0.5rem);
      }
      .tier-label { font-weight: 600; font-size: 14px; color: var(--pages-neutral-12, #111); }
      .tier-threshold { font-size: 12px; color: var(--pages-neutral-9, #888); }
      .tier--active .tier-label { color: var(--pages-orange-9, #ea580c); }
      .tier-consequence { font-size: 13px; color: var(--pages-neutral-11, #555); margin-bottom: var(--pages-space-1, 0.25rem); }
      .tier-regulation { font-size: 12px; color: var(--pages-neutral-9, #888); font-style: italic; }
    `,
  ];

  private _isActiveTier(tier: TierDefinition): boolean {
    if (!this.tiers.length) return false;
    const normalizedTime = this.timeRemaining / 100;
    const sorted = [...this.tiers].sort((a, b) => b.threshold - a.threshold);
    let active: TierDefinition | undefined;
    for (const t of sorted) {
      if (t.threshold >= normalizedTime) active = t;
      else break;
    }
    if (!active) active = sorted[sorted.length - 1];
    return tier === active;
  }

  override render() {
    if (!this.tiers.length) {
      return html`<div class="empty">No breach policy tiers defined</div>`;
    }

    return html`
      ${this.deadline ? html`
        <div class="header">
          <agency-sla-indicator .deadline=${this.deadline} compact></agency-sla-indicator>
        </div>
      ` : nothing}
      <div class="tier-list" role="list">
        ${this.tiers.map((tier, index) => html`
          <div class="tier ${this._isActiveTier(tier) ? 'tier--active' : ''}" role="listitem">
            <div class="tier-node">${index + 1}</div>
            <div class="tier-content">
              <div class="tier-header">
                <span class="tier-label">${tier.label}</span>
                <span class="tier-threshold">at ${(tier.threshold * 100).toFixed(0)}%</span>
              </div>
              <div class="tier-consequence">${tier.consequence}</div>
              ${tier.regulation ? html`<div class="tier-regulation">${tier.regulation}</div>` : nothing}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-sla-breach-policy': SlaBreachPolicy;
  }
}
