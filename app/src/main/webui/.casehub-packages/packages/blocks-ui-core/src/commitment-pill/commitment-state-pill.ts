import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { CommitmentState } from '../types/commitment.js';
import '../status-badge/status-badge.js';

/** @deprecated Use `<status-badge domain="commitment">` instead. */
@customElement('commitment-state-pill')
export class CommitmentStatePill extends LitElement {
  @property({ type: String }) state?: CommitmentState;
  @property({ type: String }) size: 'sm' | 'md' = 'sm';
  @property({ type: Boolean }) showIcon = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Commitment state');
  }

  static override styles = css`
    :host { display: inline-block; }
  `;

  override render() {
    if (!this.state) return nothing;
    return html`<status-badge
      domain="commitment"
      state=${this.state}
      size=${this.size}
      ?showIcon=${this.showIcon}
    ></status-badge>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commitment-state-pill': CommitmentStatePill;
  }
}
