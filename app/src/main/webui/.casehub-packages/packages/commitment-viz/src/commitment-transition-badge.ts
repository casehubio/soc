import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TransitionRecord } from './types.js';
import '@casehubio/pages-ui-components';
import { formatTimestamp } from '@casehubio/mosaic-core';

export interface CommitmentTransitionBadgeProps {
  transition?: TransitionRecord;
  compact: boolean;
}

@customElement('commitment-transition-badge')
export class CommitmentTransitionBadge extends LitElement {
  @property({ type: Object }) transition?: TransitionRecord;
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host { display: inline-flex; align-items: center; gap: 6px; }
    .arrow { color: var(--pages-neutral-8, #888); font-size: 12px; }
    .meta { font-size: 11px; color: var(--pages-neutral-8, #888); }
    .actor { font-weight: 500; color: var(--pages-neutral-11, #333); }
  `;



  override render() {
    if (!this.transition) return nothing;
    const { from, to, actor, timestamp } = this.transition;

    return html`
      <span aria-label="Transition from ${from} to ${to}">
        <pages-status-badge domain="commitment" .state=${from} size="sm"></pages-status-badge>
        <span class="arrow">→</span>
        <pages-status-badge domain="commitment" .state=${to} size="sm"></pages-status-badge>
      </span>
      ${!this.compact ? html`
        <span class="meta">
          ${actor ? html`<span class="actor">${actor}</span> · ` : nothing}
          ${formatTimestamp(timestamp)}
        </span>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commitment-transition-badge': CommitmentTransitionBadge;
  }
}
