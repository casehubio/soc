import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PreferenceSchemaDescriptor } from './types.js';

@customElement('agency-value-editor')
export class ValueEditor extends LitElement {
  @property({ attribute: false }) schema!: PreferenceSchemaDescriptor;
  @property({ type: String }) value = '';
  @property({ type: Boolean }) disabled = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Value editor');
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('disabled')) {
      this.setAttribute('aria-disabled', String(this.disabled));
    }
  }

  static override styles = css`
    :host { display: inline-block; }
    input, select {
      padding: 4px 8px;
      border: 1px solid var(--pages-border-color, #ccc);
      border-radius: 4px;
      font-size: 0.8125rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    input:invalid { border-color: var(--pages-danger-color, #dc3545); }
    .checkbox-wrap { display: flex; align-items: center; gap: 6px; }
  `;

  override render() {
    switch (this.schema.type) {
      case 'boolean': return this._renderBoolean();
      case 'integer': return this._renderNumber('1');
      case 'number': return this._renderNumber('any');
      case 'enum': return this._renderEnum();
      case 'duration': return this._renderDuration();
      default: return this._renderString();
    }
  }

  private _renderString() {
    const c = this.schema.constraints;
    return html`<input type="text" .value=${this.value}
      ?disabled=${this.disabled}
      pattern=${(c.pattern as string) ?? ''}
      minlength=${(c.minLength as number) ?? ''}
      maxlength=${(c.maxLength as number) ?? ''}
      @change=${this._onInput}>`;
  }

  private _renderNumber(step: string) {
    const c = this.schema.constraints;
    return html`<input type="number" .value=${this.value}
      ?disabled=${this.disabled}
      step=${step}
      min=${(c.min as number) ?? ''}
      max=${(c.max as number) ?? ''}
      @change=${this._onInput}>`;
  }

  private _renderBoolean() {
    return html`<div class="checkbox-wrap">
      <input type="checkbox" .checked=${this.value === 'true'}
        ?disabled=${this.disabled}
        @change=${(e: Event) => this._emit((e.target as HTMLInputElement).checked ? 'true' : 'false')}>
    </div>`;
  }

  private _renderEnum() {
    return html`<select .value=${this.value} ?disabled=${this.disabled} @change=${this._onInput}>
      ${this.schema.options.map(o => html`<option value=${o.value} ?selected=${o.value === this.value}>${o.label}</option>`)}
    </select>`;
  }

  private _renderDuration() {
    return html`<input type="text" .value=${this.value}
      ?disabled=${this.disabled}
      placeholder="PT1H30M"
      @change=${this._onInput}>`;
  }

  private _onInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    this._emit(target.value);
  };

  private _emit(value: string) {
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value },
      bubbles: true, composed: true,
    }));
  }
}
