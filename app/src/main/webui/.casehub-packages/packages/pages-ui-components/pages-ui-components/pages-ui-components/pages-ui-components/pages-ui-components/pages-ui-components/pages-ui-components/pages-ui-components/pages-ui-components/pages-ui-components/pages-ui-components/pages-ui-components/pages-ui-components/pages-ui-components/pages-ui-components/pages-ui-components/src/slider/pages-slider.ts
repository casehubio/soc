import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export class PagesSlider extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label {
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-12, #333);
    }
    .slider-row { display: flex; align-items: center; gap: var(--pages-space-2, 8px); }
    input[type="range"] {
      flex: 1;
      accent-color: var(--pages-accent-9, #5470c6);
    }
    input[type="number"] {
      width: 64px;
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-base, 14px);
      font-family: inherit;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #333);
      text-align: center;
    }
    input[type="number"]:focus { outline: none; border-color: var(--pages-accent-9, #5470c6); }
    input:read-only, input:disabled {
      background: var(--pages-neutral-3, #f5f5f5);
      cursor: not-allowed;
    }
    input:disabled { opacity: 0.6; }
    .error {
      color: var(--pages-danger-9, #dc2626);
      font-size: var(--pages-font-size-xs, 11px);
      margin-top: var(--pages-space-0-5, 2px);
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property() label: string | undefined;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) disabled = false;
  @property() error: string | undefined;

  private _onRangeInput(e: Event): void {
    this.value = Number((e.target as HTMLInputElement).value);
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private _onRangeChange(e: Event): void {
    this.value = Number((e.target as HTMLInputElement).value);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _onNumberChange(e: Event): void {
    const v = Number((e.target as HTMLInputElement).value);
    if (!isNaN(v)) {
      this.value = Math.min(this.max, Math.max(this.min, v));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  override render() {
    const isInactive = this.disabled || this.readonly;
    return html`
      <div class="field">
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <div class="slider-row">
          <input
            type="range"
            .value=${String(this.value)}
            min=${String(this.min)}
            max=${String(this.max)}
            step=${String(this.step)}
            ?disabled=${isInactive}
            aria-label=${ifDefined(this.label)}
            aria-invalid=${ifDefined(this.error ? 'true' : undefined)}
            @input=${this._onRangeInput}
            @change=${this._onRangeChange}
          />
          <input
            type="number"
            .value=${String(this.value)}
            min=${String(this.min)}
            max=${String(this.max)}
            step=${String(this.step)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            aria-label=${ifDefined(this.label ? `${this.label} value` : 'value')}
            @change=${this._onNumberChange}
          />
        </div>
        ${this.error ? html`<span class="error" role="alert">${this.error}</span>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('pages-slider')) {
  customElements.define('pages-slider', PagesSlider);
}
