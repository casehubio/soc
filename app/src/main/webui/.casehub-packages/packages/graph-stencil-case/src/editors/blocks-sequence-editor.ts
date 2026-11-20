import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('blocks-sequence-editor')
export class BlocksSequenceEditorElement extends LitElement {
  @property({ type: Array }) value: string[] = [];

  static override styles = css`
    :host { display: block; }
    ol { margin: 0; padding-left: 1.5em; font-size: 13px; }
    li { padding: 2px 0; }
  `;

  override render() {
    return html`
      <ol role="list" aria-label="Worker sequence">
        ${this.value.map(name => html`<li>${name}</li>`)}
      </ol>
    `;
  }
}
