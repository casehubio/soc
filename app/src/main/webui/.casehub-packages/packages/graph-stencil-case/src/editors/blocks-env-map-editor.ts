import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('blocks-env-map-editor')
export class BlocksEnvMapEditorElement extends LitElement {
  @property({ type: Object }) value: Record<string, string> = {};

  static override styles = css`
    :host { display: block; }
    textarea { width: 100%; min-height: 60px; font-family: monospace; font-size: 12px; resize: vertical; }
  `;

  override render() {
    const text = Object.entries(this.value).map(([k, v]) => `${k}=${v}`).join('\n');
    return html`
      <textarea
        .value=${text}
        aria-label="Environment variables"
        placeholder="KEY=VALUE (one per line)"
        @input=${this._onInput}></textarea>
    `;
  }

  private _onInput(e: Event) {
    const lines = (e.target as HTMLTextAreaElement).value.split('\n');
    const result: Record<string, string> = {};
    for (const line of lines) {
      const idx = line.indexOf('=');
      if (idx > 0) result[line.slice(0, idx)] = line.slice(idx + 1);
    }
    this.value = result;
    this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }
}
