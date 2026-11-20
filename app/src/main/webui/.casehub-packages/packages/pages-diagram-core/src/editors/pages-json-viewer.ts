import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class PagesJsonViewer extends LitElement {
  @property({ type: Object }) value: unknown = {};

  static override styles = css`
    :host { display: block; }
    pre { font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; margin: 0; }
  `;

  override render() {
    return html`<pre role="region" aria-label="JSON viewer">${JSON.stringify(this.value, null, 2)}</pre>`;
  }
}

if (!customElements.get('pages-json-viewer')) {
  customElements.define('pages-json-viewer', PagesJsonViewer);
}
