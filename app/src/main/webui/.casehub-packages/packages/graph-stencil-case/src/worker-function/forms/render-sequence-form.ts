import { html, nothing, type TemplateResult } from 'lit-html';
import type { OnChange } from './render-auth-config.js';

export function renderSequenceForm(
  data: string[],
  readonly: boolean,
  onChange: OnChange,
  workerNames: string[],
): TemplateResult {
  const items = data ?? [];
  const usedNames = new Set(items);
  const available = workerNames.filter(n => !usedNames.has(n));

  function emitReorder(fromIdx: number, toIdx: number): void {
    const next = [...items];
    const moved = next.splice(fromIdx, 1)[0];
    if (moved != null) next.splice(toIdx, 0, moved);
    onChange([], next);
  }

  return html`
    <div style="display: flex; flex-direction: column; gap: 4px;">
      ${items.length === 0 ? html`
        <div style="font-size: 11px; color: var(--pages-text-tertiary, #999); font-style: italic;">No steps</div>
      ` : nothing}

      ${items.map((name, idx) => html`
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 6px; background: var(--pages-surface-raised, #f5f5f5); border-radius: 3px; font-size: 12px;"
          draggable=${readonly ? 'false' : 'true'}
          @dragstart=${(e: DragEvent) => { e.dataTransfer?.setData('text/plain', String(idx)); }}
          @dragover=${(e: DragEvent) => { e.preventDefault(); }}
          @drop=${(e: DragEvent) => {
            e.preventDefault();
            const from = Number(e.dataTransfer?.getData('text/plain'));
            if (!isNaN(from) && from !== idx) emitReorder(from, idx);
          }}>
          ${readonly ? nothing : html`<span style="cursor: grab; color: var(--pages-text-tertiary, #999); font-size: 10px;">⠿</span>`}
          <span style="flex: 1; color: var(--pages-text-color, #333);">${name}</span>
          ${readonly ? nothing : html`
            <button type="button" style="border: none; background: none; cursor: pointer; font-size: 11px; color: var(--pages-text-tertiary, #999); padding: 0 2px;" title="Remove"
              @click=${() => {
                const next = items.filter((_, i) => i !== idx);
                onChange([], next);
              }}>✕</button>
          `}
        </div>
      `)}

      ${!readonly && available.length > 0 ? html`
        <select style="font-size: 12px; padding: 4px; margin-top: 4px;"
          @change=${(e: Event) => {
            const sel = (e.target as HTMLSelectElement);
            const val = sel.value;
            if (val) {
              onChange([], [...items, val]);
              sel.value = '';
            }
          }}>
          <option value="">+ Add step…</option>
          ${available.map(n => html`<option value=${n}>${n}</option>`)}
        </select>
      ` : nothing}
    </div>
  `;
}
