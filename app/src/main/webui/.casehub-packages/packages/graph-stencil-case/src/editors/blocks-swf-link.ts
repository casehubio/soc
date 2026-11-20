import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';

@customElement('blocks-swf-link')
export class BlocksSwfLinkElement extends LitElement {
  static override styles = css`
    :host { display: block; }
    a { font-size: 13px; color: var(--pages-accent-9, #2563eb); cursor: pointer; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `;

  override render() {
    return html`<a role="link" aria-label="Drill down to definition"
      @click=${this._handleClick}>Drill down ⤢</a>`;
  }

  private _handleClick(e: Event): void {
    e.preventDefault();
    emitPagesEvent(this, 'diagram:property-drill-down', {});
  }
}
