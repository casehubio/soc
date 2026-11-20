import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export class PagesBadge extends LitElement {
  static override styles = css`
    :host { display: inline-block; }
    .badge {
      display: inline-block;
      padding: var(--pages-space-0-5, 2px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-full, 9999px);
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-semibold, 600);
      font-family: var(--pages-font-family, system-ui, sans-serif);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      line-height: 1.4;
    }
    .badge.sm { font-size: 10px; padding: 1px 6px; }
    .badge.success { background: var(--pages-success-3); color: var(--pages-success-11); }
    .badge.warning { background: var(--pages-warning-3); color: var(--pages-warning-11); }
    .badge.danger { background: var(--pages-danger-3); color: var(--pages-danger-11); }
    .badge.neutral { background: var(--pages-neutral-4); color: var(--pages-neutral-11); }
    .badge.info { background: var(--pages-info-3); color: var(--pages-info-11); }
    .badge.accent { background: var(--pages-accent-3); color: var(--pages-accent-11); }
  `;

  @property() label = '';
  @property() variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent' = 'neutral';
  @property() size: 'sm' | 'md' = 'md';

  override render() {
    const classes = { badge: true, [this.variant]: true, [this.size]: this.size !== 'md' };
    return html`<span class=${classMap(classes)} role="status" aria-label=${this.label}>${this.label}</span>`;
  }
}

if (!customElements.get('pages-badge')) {
  customElements.define('pages-badge', PagesBadge);
}
