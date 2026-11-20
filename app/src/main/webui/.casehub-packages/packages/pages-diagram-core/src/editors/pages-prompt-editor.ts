import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class PagesPromptEditor extends LitElement {
  @property() value = '';

  static override styles = css`
    :host { display: block; }
    textarea { width: 100%; min-height: 80px; font-family: monospace; font-size: 13px; resize: vertical; }
  `;

  override render() {
    return html`
      <textarea
        .value=${this.value}
        aria-label="Prompt editor"
        @input=${this._onInput}></textarea>
    `;
  }

  private _onInput(e: Event) {
    this.value = (e.target as HTMLTextAreaElement).value;
    this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }
}

if (!customElements.get('pages-prompt-editor')) {
  customElements.define('pages-prompt-editor', PagesPromptEditor);
}
