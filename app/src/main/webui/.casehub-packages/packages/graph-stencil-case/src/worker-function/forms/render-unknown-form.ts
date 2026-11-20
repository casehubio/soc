import { html, type TemplateResult } from 'lit-html';
import { CORE_WORKER_KEYS } from '../types.js';

export function renderUnknownForm(data: Record<string, unknown>): TemplateResult {
  const unknownEntries: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!CORE_WORKER_KEYS.has(k)) unknownEntries[k] = v;
  }

  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="font-size: 11px; color: #b45309; background: #fef3c7; padding: 6px 8px; border-radius: 3px;">
        Unrecognised function configuration
      </div>
      <pre style="font-size: 11px; background: var(--pages-surface-raised, #f5f5f5); padding: 6px 8px; border-radius: 3px; overflow-x: auto; margin: 0; white-space: pre-wrap;">${JSON.stringify(unknownEntries, null, 2)}</pre>
    </div>
  `;
}
