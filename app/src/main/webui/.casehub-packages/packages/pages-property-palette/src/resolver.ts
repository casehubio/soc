import type { FieldSchema } from '@casehubio/pages-component';
import type { EditorDescriptor, FieldRenderContext } from './types.js';
import { html } from 'lit';

export function resolveEditor(schema: FieldSchema): EditorDescriptor {
  const type = normalizeType(schema.type);
  const displayHint = schema['x-display-hint'] as string | undefined;

  if (type === 'boolean') {
    return { kind: 'tag', tag: 'pages-checkbox' };
  }

  if (type === 'number' || type === 'integer') {
    if (displayHint === 'slider') return { kind: 'tag', tag: 'pages-slider' };
    return { kind: 'tag', tag: 'pages-number-input' };
  }

  if (type === 'string') {
    if (schema.enum && schema.enum.length > 0) return { kind: 'tag', tag: 'pages-select' };
    if (displayHint === 'textarea') return { kind: 'tag', tag: 'pages-textarea' };
    if (schema.format === 'color') return { kind: 'tag', tag: 'pages-color-swatch' };
    if (schema.format === 'date') return { kind: 'tag', tag: 'pages-date-input' };
    if (schema.format === 'date-time') return { kind: 'tag', tag: 'pages-datetime-input' };
    if (schema.format === 'duration') return { kind: 'tag', tag: 'pages-duration-input' };
    if (schema.format === 'uri') return { kind: 'tag', tag: 'pages-input', config: { type: 'url' } };
    return { kind: 'tag', tag: 'pages-input' };
  }

  if (type === 'array') {
    if (schema.items?.enum) {
      return { kind: 'render', render: renderMultiSelectCheckboxes };
    }
    if (schema.items?.type === 'string') return { kind: 'tag', tag: 'pages-tag-editor' };
    return jsonDisplayDescriptor();
  }

  if (type === 'object') {
    if (schema.properties && Object.keys(schema.properties).length > 0) {
      return { kind: 'render', render: () => html`` };
    }
    return jsonDisplayDescriptor();
  }

  return jsonDisplayDescriptor();
}

function normalizeType(type: string | readonly string[] | undefined): string | undefined {
  if (!type) return undefined;
  if (typeof type === 'string') return type;
  const nonNull = type.filter(t => t !== 'null');
  return nonNull.length === 1 ? nonNull[0] : undefined;
}

function jsonDisplayDescriptor(): EditorDescriptor {
  return {
    kind: 'render',
    render: (ctx: FieldRenderContext) =>
      html`<pre style="font-size: 11px; margin: 0; white-space: pre-wrap; color: var(--pages-neutral-11, #374151);">${JSON.stringify(ctx.value, null, 2) ?? '—'}</pre>`,
  };
}

function renderMultiSelectCheckboxes(ctx: FieldRenderContext) {
  const options = ctx.schema.items?.enum ?? [];
  const selected = new Set(Array.isArray(ctx.value) ? ctx.value as string[] : []);
  return html`
    <div role="group" aria-label=${ctx.key} style="display: flex; flex-direction: column; gap: 4px;">
      ${options.map(opt => html`
        <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--pages-neutral-12, #333);">
          <input type="checkbox" .checked=${selected.has(opt)} ?disabled=${ctx.readonly}
            style="accent-color: var(--pages-accent-9, #5470c6);"
            @change=${(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              const next = checked
                ? [...selected, opt]
                : [...selected].filter(v => v !== opt);
              ctx.onChange(next);
            }}
          />
          ${opt}
        </label>
      `)}
    </div>
  `;
}
