import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { lookupStatus } from './status-registry.js';
import { stateCategoryStyles } from './category-styles.js';

export class PagesStatusBadge extends LitElement {
  @property({ type: String }) state?: string;
  @property({ type: String }) domain?: string;
  @property({ type: String }) size: 'sm' | 'md' = 'sm';
  @property({ type: Boolean }) showIcon = false;

  static override styles = css`
    :host { display: inline-block; }
  `;

  override render() {
    if (!this.state) return nothing;
    const descriptor = lookupStatus(this.domain, this.state);
    const colors = stateCategoryStyles(descriptor.category);
    const fontSize = this.size === 'md' ? '12px' : '10px';
    const padding = this.size === 'md' ? '2px 8px' : '1px 6px';
    const displayLabel = descriptor.label ?? this.state;

    const styles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize,
      fontWeight: '500',
      padding,
      borderRadius: '9999px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      lineHeight: '1.4',
      background: colors.background,
      color: colors.color,
    };

    return html`
      <span class="pill" style=${styleMap(styles)} aria-label="Status: ${displayLabel}">
        ${this.showIcon ? html`<span class="icon">${descriptor.icon}</span>` : nothing}
        ${displayLabel}
      </span>
    `;
  }
}

if (!customElements.get('pages-status-badge')) {
  customElements.define('pages-status-badge', PagesStatusBadge);
}
