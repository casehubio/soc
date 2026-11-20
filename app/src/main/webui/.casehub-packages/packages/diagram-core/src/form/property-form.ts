import { html, nothing, type TemplateResult } from 'lit-html';
import { fieldTypeFor } from './field-renderer.js';
import { validateField, type FieldSchema } from './validation.js';
import { renderTriggerEditor } from './trigger-editor.js';
import { renderNestedGroup } from './nested-group.js';

export function emitPropertyChange(
  field: (string | number)[],
  value: unknown,
): CustomEvent<{ field: (string | number)[]; value: unknown }> {
  return new CustomEvent('property-change', {
    bubbles: true,
    composed: true,
    detail: { field, value },
  });
}

export function renderPropertyForm(
  schema: Record<string, unknown>,
  data: Record<string, unknown>,
  readonly: boolean,
  onChange: (field: (string | number)[], value: unknown) => void,
): TemplateResult {
  const props = (schema.properties ?? {}) as Record<string, FieldSchema>;
  const requiredSet = new Set((schema.required as string[] | undefined) ?? []);

  const fields = Object.keys(props).filter(k => !k.startsWith('_'));
  if (fields.includes('name')) {
    fields.splice(fields.indexOf('name'), 1);
    fields.unshift('name');
  }

  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${fields.map(key => renderField(key, props[key]!, data[key], requiredSet.has(key), readonly, onChange))}
    </div>
  `;
}

function renderField(
  key: string,
  fieldSchema: FieldSchema,
  value: unknown,
  required: boolean,
  readonly: boolean,
  onChange: (field: (string | number)[], value: unknown) => void,
): TemplateResult {
  const ft = fieldTypeFor(fieldSchema);
  const error = value !== undefined ? validateField(fieldSchema, value, required) : null;
  const label = (fieldSchema as { title?: string }).title ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

  if (key === 'on' && ft === 'oneOf') {
    return renderTriggerEditor(
      (value ?? {}) as Record<string, unknown>,
      v => onChange(['on'], v),
    );
  }

  if (ft === 'object') {
    return renderNestedGroup(label, fieldSchema, value as Record<string, unknown> | undefined, (subField, subVal) => {
      onChange([key, subField], subVal);
    });
  }

  if (ft === 'json') {
    return html`
      <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">${label}
        <pre style="font-size: 11px; background: var(--pages-surface-raised, #f5f5f5); padding: 4px 6px; border-radius: 3px; overflow-x: auto; margin: 2px 0;">${JSON.stringify(value, null, 2) ?? '—'}</pre>
      </label>
    `;
  }

  if (ft === 'select') {
    const opts = (fieldSchema.enum ?? []) as string[];
    return html`
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">${label}${required ? ' *' : ''}
        <select style="width: 100%; font-size: 12px; padding: 4px;" ?disabled=${readonly}
          @change=${(e: Event) => onChange([key], (e.target as HTMLSelectElement).value || undefined)}>
          <option value="">—</option>
          ${opts.map(o => html`<option .selected=${value === o}>${o}</option>`)}
        </select>
      </label>
      ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
    `;
  }

  if (ft === 'checkbox') {
    return html`
      <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; color: var(--pages-text-color, #333);">
        <input type="checkbox" ?checked=${Boolean(value)} ?disabled=${readonly}
          @change=${(e: Event) => onChange([key], (e.target as HTMLInputElement).checked)}>
        ${label}
      </label>
    `;
  }

  if (ft === 'number') {
    const min = fieldSchema.minimum;
    const max = fieldSchema.maximum;
    return html`
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">${label}${required ? ' *' : ''}
        <input type="number" style="width: 100%; font-size: 12px; padding: 4px;"
          .value=${String(value ?? '')} ?disabled=${readonly}
          min=${min ?? nothing} max=${max ?? nothing}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            onChange([key], v === '' ? undefined : Number(v));
          }}>
      </label>
      ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
    `;
  }

  if (ft === 'textarea') {
    return html`
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">${label}${required ? ' *' : ''}
        <textarea rows="3" style="width: 100%; font-family: monospace; font-size: 12px; padding: 4px;" ?disabled=${readonly}
          .value=${String(value ?? '')}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLTextAreaElement).value;
            onChange([key], v === '' && !required ? undefined : v);
          }}></textarea>
      </label>
      ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
    `;
  }

  if (ft === 'string-array') {
    const arr = (value as string[] | undefined) ?? [];
    return html`
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">${label}
        <textarea rows="3" style="width: 100%; font-size: 12px; padding: 4px;" ?disabled=${readonly}
          .value=${arr.join('\n')}
          @blur=${(e: Event) => {
            const lines = (e.target as HTMLTextAreaElement).value.split('\n').filter(l => l.trim());
            onChange([key], lines.length > 0 ? lines : undefined);
          }}></textarea>
        <span style="font-size: 10px; color: var(--pages-text-tertiary, #999);">One per line</span>
      </label>
    `;
  }

  return html`
    <label style="font-size: 12px; color: var(--pages-text-color, #333);">${label}${required ? ' *' : ''}
      <input type="text" style="width: 100%; font-size: 12px; padding: 4px;" ?disabled=${readonly}
        .value=${String(value ?? '')}
        @blur=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          onChange([key], v === '' && !required ? undefined : v);
        }}>
    </label>
    ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
  `;
}
