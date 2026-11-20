import { html, nothing, type TemplateResult } from 'lit-html';
import { fieldTypeFor } from './field-renderer.js';
import { validateField, type FieldSchema } from './validation.js';

export function renderNestedGroup(
  name: string,
  schema: FieldSchema,
  data: Record<string, unknown> | undefined,
  onChange: (field: string, value: unknown) => void,
): TemplateResult {
  const props = schema.properties as Record<string, FieldSchema> | undefined;
  if (!props) {
    return html`<pre style="font-size: 11px; color: var(--pages-text-tertiary, #999);">${JSON.stringify(data, null, 2)}</pre>`;
  }

  const requiredSet = new Set((schema.required as string[] | undefined) ?? []);
  const current = data ?? {};

  return html`
    <details open style="border: 1px solid var(--pages-border-color, #ddd); border-radius: 4px; margin: 4px 0;">
      <summary style="padding: 6px 8px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--pages-text-secondary, #666);">${name}</summary>
      <div style="padding: 4px 8px 8px; display: flex; flex-direction: column; gap: 6px;">
        ${Object.entries(props).map(([key, fieldSchema]) => {
          const ft = fieldTypeFor(fieldSchema);
          const value = current[key];
          const required = requiredSet.has(key);
          const error = value !== undefined ? validateField(fieldSchema, value, required) : null;
          const label = (fieldSchema as { title?: string }).title ?? key;

          if (ft === 'object') {
            return renderNestedGroup(
              key,
              fieldSchema,
              value as Record<string, unknown> | undefined,
              (subField, subVal) => {
                const updated = { ...(current[key] as Record<string, unknown> ?? {}), [subField]: subVal };
                onChange(key, updated);
              },
            );
          }

          if (ft === 'json') {
            return html`
              <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">${label}
                <pre style="font-size: 11px; color: var(--pages-text-tertiary, #999); margin: 2px 0;">${JSON.stringify(value, null, 2) ?? '—'}</pre>
              </label>
            `;
          }

          if (ft === 'select') {
            const opts = (fieldSchema.enum ?? []) as string[];
            return html`
              <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">${label}${required ? ' *' : ''}
                <select style="width: 100%; font-size: 12px;"
                  @change=${(e: Event) => onChange(key, (e.target as HTMLSelectElement).value || undefined)}>
                  <option value="">—</option>
                  ${opts.map(o => html`<option .selected=${value === o}>${o}</option>`)}
                </select>
              </label>
              ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
            `;
          }

          if (ft === 'number') {
            return html`
              <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">${label}${required ? ' *' : ''}
                <input type="number" style="width: 100%; font-size: 12px;"
                  .value=${String(value ?? '')}
                  @blur=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    onChange(key, v === '' ? undefined : Number(v));
                  }}>
              </label>
              ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
            `;
          }

          return html`
            <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">${label}${required ? ' *' : ''}
              <input type="text" style="width: 100%; font-size: 12px;"
                .value=${String(value ?? '')}
                @blur=${(e: Event) => {
                  const v = (e.target as HTMLInputElement).value;
                  onChange(key, v === '' ? undefined : v);
                }}>
            </label>
            ${error ? html`<div style="color: red; font-size: 11px;">${error}</div>` : nothing}
          `;
        })}
      </div>
    </details>
  `;
}
