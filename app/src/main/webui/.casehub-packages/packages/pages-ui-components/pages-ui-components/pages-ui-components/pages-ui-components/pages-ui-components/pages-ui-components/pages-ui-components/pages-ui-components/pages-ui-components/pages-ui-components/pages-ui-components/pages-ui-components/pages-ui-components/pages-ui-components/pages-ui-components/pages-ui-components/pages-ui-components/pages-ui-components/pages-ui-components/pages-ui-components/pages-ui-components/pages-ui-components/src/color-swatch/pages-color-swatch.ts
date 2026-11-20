import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export class PagesColorSwatch extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label {
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-12, #333);
    }
    .color-row { display: flex; align-items: center; gap: var(--pages-space-2, 8px); }
    input[type="color"] {
      width: 32px; height: 32px;
      padding: 0; border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      cursor: pointer; background: none;
    }
    input[type="color"]:disabled { cursor: not-allowed; opacity: 0.6; }
    input[type="text"] {
      width: 80px;
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-base, 14px);
      font-family: var(--pages-font-mono, monospace);
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #333);
    }
    input[type="text"]:focus { outline: none; border-color: var(--pages-accent-9, #5470c6); }
    input[type="text"]:read-only { background: var(--pages-neutral-3, #f5f5f5); cursor: not-allowed; }
    input[type="text"]:disabled { background: var(--pages-neutral-3, #f5f5f5); cursor: not-allowed; opacity: 0.6; }
    .error {
      color: var(--pages-danger-9, #dc2626);
      font-size: var(--pages-font-size-xs, 11px);
      margin-top: var(--pages-space-0-5, 2px);
    }
  `;

  @property() value = '#000000';
  @property() label: string | undefined;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) disabled = false;
  @property() error: string | undefined;

  override render() {
    return html`
      <div class="field">
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <div class="color-row">
          <input
            type="color"
            .value=${this.value}
            ?disabled=${this.disabled || this.readonly}
            aria-label=${ifDefined(this.label ? `${this.label} color picker` : undefined)}
            @input=${(e: Event) => {
              this.value = (e.target as HTMLInputElement).value;
              this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            }}
            @change=${(e: Event) => {
              this.value = (e.target as HTMLInputElement).value;
              this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            }}
          />
          <input
            type="text"
            .value=${this.value}
            ?readonly=${this.readonly}
            ?disabled=${this.disabled}
            aria-label=${ifDefined(this.label ? `${this.label} hex value` : 'hex value')}
            aria-invalid=${ifDefined(this.error ? 'true' : undefined)}
            @blur=${(e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                this.value = v.toLowerCase();
                this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
              } else {
                (e.target as HTMLInputElement).value = this.value;
              }
            }}
          />
        </div>
        ${this.error ? html`<span class="error" role="alert">${this.error}</span>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('pages-color-swatch')) {
  customElements.define('pages-color-swatch', PagesColorSwatch);
}
