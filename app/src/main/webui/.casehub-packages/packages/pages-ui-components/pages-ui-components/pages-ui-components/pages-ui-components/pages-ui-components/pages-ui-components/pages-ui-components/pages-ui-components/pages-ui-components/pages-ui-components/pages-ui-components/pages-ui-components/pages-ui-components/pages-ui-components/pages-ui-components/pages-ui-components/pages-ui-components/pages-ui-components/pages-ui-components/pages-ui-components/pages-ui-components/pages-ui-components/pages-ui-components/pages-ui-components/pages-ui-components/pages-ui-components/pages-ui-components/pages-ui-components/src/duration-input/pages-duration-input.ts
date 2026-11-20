import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type DurationField = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds';

const UNIT_LABELS: Record<DurationField, string> = {
  years: 'y', months: 'mo', days: 'd', hours: 'h', minutes: 'm', seconds: 's',
};

const UNIT_NAMES: Record<DurationField, string> = {
  years: 'years', months: 'months', days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds',
};

const DURATION_RE = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

const FIELD_PARSE_INDEX: Record<DurationField, number> = {
  years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6,
};

function parseDuration(value: string, fields: readonly DurationField[]): Record<DurationField, number> {
  const result = {} as Record<DurationField, number>;
  for (const f of fields) result[f] = 0;
  if (!value) return result;
  const match = value.match(DURATION_RE);
  if (!match) return result;
  for (const f of fields) {
    const v = match[FIELD_PARSE_INDEX[f]];
    result[f] = v ? parseInt(v, 10) : 0;
  }
  return result;
}

function serializeDuration(values: Record<DurationField, number>): string {
  const y = values.years || 0;
  const mo = values.months || 0;
  const d = values.days || 0;
  const h = values.hours || 0;
  const m = values.minutes || 0;
  const s = values.seconds || 0;

  let datePart = '';
  if (y) datePart += `${y}Y`;
  if (mo) datePart += `${mo}M`;
  if (d) datePart += `${d}D`;

  let timePart = '';
  if (h) timePart += `${h}H`;
  if (m) timePart += `${m}M`;
  if (s) timePart += `${s}S`;

  if (!datePart && !timePart) return 'PT0S';
  return `P${datePart}${timePart ? `T${timePart}` : ''}`;
}

export class PagesDurationInput extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label {
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-12, #333);
    }
    .duration-fields { display: inline-flex; gap: var(--pages-space-2, 8px); align-items: flex-start; }
    .unit { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .unit input {
      width: 3.5em;
      text-align: center;
      padding: var(--pages-space-1, 4px) var(--pages-space-1, 4px);
      border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-base, 14px);
      font-family: inherit;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #333);
      transition: border-color var(--pages-duration-fast, 150ms) var(--pages-ease-out, ease-out);
    }
    .unit input:focus { outline: none; border-color: var(--pages-accent-9, #5470c6); }
    .unit input:read-only { background: var(--pages-neutral-3, #f5f5f5); cursor: not-allowed; }
    .unit input:disabled { background: var(--pages-neutral-3, #f5f5f5); cursor: not-allowed; opacity: 0.6; }
    .unit-label {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-9, #6b7280);
    }
    .error {
      color: var(--pages-danger-9, #dc2626);
      font-size: var(--pages-font-size-xs, 11px);
      margin-top: var(--pages-space-0-5, 2px);
    }
  `;

  @property() value = '';
  @property({ attribute: false }) fields: DurationField[] = ['hours', 'minutes', 'seconds'];
  @property() label: string | undefined;
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) disabled = false;
  @property() error: string | undefined;

  private _values: Record<DurationField, number> = {} as any;

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('fields')) {
      this._values = parseDuration(this.value, this.fields);
    }
  }

  private _onFieldChange(field: DurationField, e: Event) {
    const input = e.target as HTMLInputElement;
    const v = input.value === '' ? 0 : Math.max(0, parseInt(input.value, 10) || 0);
    this._values = { ...this._values, [field]: v };
    this.value = serializeDuration(this._values);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  override render() {
    const groupLabel = this.label ?? 'Duration';
    return html`
      <div class="field">
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <div class="duration-fields" role="group"
          aria-label=${groupLabel}
          aria-required=${ifDefined(this.required ? 'true' : undefined)}
          aria-invalid=${ifDefined(this.error ? 'true' : undefined)}
        >
          ${this.fields.map(f => html`
            <div class="unit">
              <input type="number"
                min="0" step="1"
                .value=${String(this._values[f] ?? 0)}
                ?readonly=${this.readonly}
                ?disabled=${this.disabled}
                aria-label="${groupLabel} ${UNIT_NAMES[f]}"
                @change=${(e: Event) => { this._onFieldChange(f, e); }}
              />
              <span class="unit-label">${UNIT_LABELS[f]}</span>
            </div>
          `)}
        </div>
        ${this.error ? html`<span class="error" role="alert">${this.error}</span>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('pages-duration-input')) {
  customElements.define('pages-duration-input', PagesDurationInput);
}
