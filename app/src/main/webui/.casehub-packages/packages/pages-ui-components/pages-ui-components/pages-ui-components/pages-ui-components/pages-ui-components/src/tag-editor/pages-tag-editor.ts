import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export class PagesTagEditor extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label {
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-12, #333);
    }
    .tag-container {
      display: flex; flex-wrap: wrap; gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-1, 4px);
      border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-1, #fff);
      min-height: 32px;
      align-items: center;
    }
    .tag-container:focus-within { border-color: var(--pages-accent-9, #5470c6); }
    .tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px;
      background: var(--pages-accent-3, #e0e7ff);
      color: var(--pages-accent-11, #3730a3);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: 500;
    }
    .tag button {
      background: none; border: none; cursor: pointer;
      color: var(--pages-accent-11, #3730a3);
      font-size: 14px; line-height: 1; padding: 0;
      display: flex; align-items: center;
    }
    .tag button:hover { color: var(--pages-danger-9, #dc2626); }
    .tag-input {
      border: none; outline: none;
      font-size: var(--pages-font-size-base, 14px);
      font-family: inherit;
      flex: 1; min-width: 80px;
      background: transparent;
      color: var(--pages-neutral-12, #333);
    }
    .error {
      color: var(--pages-danger-9, #dc2626);
      font-size: var(--pages-font-size-xs, 11px);
      margin-top: var(--pages-space-0-5, 2px);
    }
    .hint {
      color: var(--pages-neutral-8, #9ca3af);
      font-size: var(--pages-font-size-xs, 11px);
    }
  `;

  @property({ attribute: false }) value: string[] = [];
  @property() label: string | undefined;
  @property() placeholder: string | undefined;
  @property({ type: Number }) maxItems: number | undefined;
  @property({ type: Boolean }) uniqueItems = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) disabled = false;
  @property() error: string | undefined;

  @state() private _hint = '';

  private _liveRegion: HTMLElement | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._liveRegion?.remove();
    this._liveRegion = null;
  }

  private _announce(message: string): void {
    if (!this._liveRegion) {
      this._liveRegion = document.createElement('div');
      this._liveRegion.setAttribute('aria-live', 'polite');
      this._liveRegion.setAttribute('aria-atomic', 'true');
      this._liveRegion.setAttribute('role', 'status');
      Object.assign(this._liveRegion.style, {
        position: 'absolute', width: '1px', height: '1px',
        overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap',
      });
      document.body.appendChild(this._liveRegion);
    }
    this._liveRegion.textContent = '';
    void this._liveRegion.offsetHeight;
    this._liveRegion.textContent = message;
  }

  private _addTag(tag: string): void {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (this.uniqueItems && this.value.includes(trimmed)) {
      this._hint = `'${trimmed}' already exists`;
      return;
    }
    if (this.maxItems != null && this.value.length >= this.maxItems) {
      this._hint = `Maximum ${this.maxItems} items`;
      return;
    }
    this._hint = '';
    this.value = [...this.value, trimmed];
    this._announce(`Added tag '${trimmed}'`);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _removeTag(index: number): void {
    const removed = this.value[index];
    this.value = this.value.filter((_, i) => i !== index);
    this._hint = '';
    if (removed) this._announce(`Removed tag '${removed}'`);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      this._addTag(input.value);
      input.value = '';
    }
  }

  override render() {
    const atMax = this.maxItems != null && this.value.length >= this.maxItems;
    return html`
      <div class="field">
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <div class="tag-container" role="list" aria-label=${ifDefined(this.label)}>
          ${this.value.map((tag, i) => html`
            <span class="tag" role="listitem">
              ${tag}
              ${!this.readonly ? html`
                <button
                  aria-label="Remove '${tag}'"
                  ?disabled=${this.disabled}
                  @click=${() => { this._removeTag(i); }}
                >&times;</button>
              ` : nothing}
            </span>
          `)}
          ${!this.readonly ? html`
            <input
              class="tag-input"
              type="text"
              placeholder=${ifDefined(atMax ? undefined : (this.placeholder ?? 'Add tag...'))}
              ?disabled=${this.disabled || atMax}
              aria-label=${ifDefined(this.label)}
              @keydown=${this._onKeydown}
            />
          ` : nothing}
        </div>
        ${this._hint ? html`<span class="hint">${this._hint}</span>` : nothing}
        ${this.error ? html`<span class="error" role="alert">${this.error}</span>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('pages-tag-editor')) {
  customElements.define('pages-tag-editor', PagesTagEditor);
}
