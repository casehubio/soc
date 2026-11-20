import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';

export class PagesDiagramToolbar extends LitElement {
  @property({ type: Boolean }) dirty = false;
  @property({ type: Boolean }) saving = false;
  @property({ type: Boolean }) hasBackend = false;
  @property({ type: Boolean }) hasNodes = false;

  static override styles = css`
    :host { display: flex; align-items: center; gap: 8px; padding: 4px 12px; border-bottom: 1px solid var(--pages-border-color, #ddd); height: 32px; box-sizing: border-box; font-family: var(--pages-font-family, system-ui, sans-serif); }
    button {
      border: 1px solid var(--pages-border-color, #ccc); border-radius: 4px;
      background: var(--pages-surface-color, #fff); cursor: pointer;
      padding: 2px 10px; font-size: 12px; color: var(--pages-text-color, #333);
      display: flex; align-items: center; gap: 4px;
    }
    button:hover:not(:disabled) { background: var(--pages-surface-raised, #f5f5f5); }
    button:disabled { opacity: 0.4; cursor: default; }
    .dirty-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pages-warning-color, #f59e0b); }
    .spacer { flex: 1; }
  `;

  override render() {
    const saveSection = this.hasBackend ? html`
      <button ?disabled=${!this.dirty || this.saving} @click=${this._save}>
        ${this.saving ? 'Saving…' : 'Save'}
      </button>
      ${this.dirty ? html`<span class="dirty-dot"></span>` : nothing}
    ` : nothing;

    return html`
      ${saveSection}
      <span class="spacer"></span>
      <button ?disabled=${!this.hasNodes} @click=${() => { this._export('svg'); }}>Export SVG</button>
      <button ?disabled=${!this.hasNodes} @click=${() => { this._export('png'); }}>Export PNG</button>
    `;
  }

  private _save(): void {
    this.dispatchEvent(new CustomEvent('toolbar-save', { bubbles: true, composed: true }));
  }

  private _export(format: 'svg' | 'png'): void {
    this.dispatchEvent(new CustomEvent('toolbar-export', {
      detail: { format },
      bubbles: true,
      composed: true,
    }));
  }
}

if (!customElements.get('pages-diagram-toolbar')) {
  customElements.define('pages-diagram-toolbar', PagesDiagramToolbar);
}
