import { LitElement, css } from 'lit';
import { property } from 'lit/decorators.js';

export class PagesStatusDot extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    :host([size="sm"]) { width: 6px; height: 6px; }
    :host([variant="success"]) { background: var(--pages-success-9); }
    :host([variant="warning"]) { background: var(--pages-warning-9); }
    :host([variant="danger"]) { background: var(--pages-danger-9); }
    :host([variant="neutral"]) { background: var(--pages-neutral-7); }
    :host([variant="info"]) { background: var(--pages-info-9); }
  `;

  @property({ reflect: true }) variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' = 'neutral';
  @property({ reflect: true }) size: 'sm' | 'md' = 'md';
  @property({ reflect: true }) override role = 'status';

  override connectedCallback() {
    super.connectedCallback();
    this._syncAriaLabel();
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('variant')) {
      this._syncAriaLabel();
    }
  }

  private _syncAriaLabel() {
    this.setAttribute('aria-label', this.variant);
  }
}

if (!customElements.get('pages-status-dot')) {
  customElements.define('pages-status-dot', PagesStatusDot);
}
