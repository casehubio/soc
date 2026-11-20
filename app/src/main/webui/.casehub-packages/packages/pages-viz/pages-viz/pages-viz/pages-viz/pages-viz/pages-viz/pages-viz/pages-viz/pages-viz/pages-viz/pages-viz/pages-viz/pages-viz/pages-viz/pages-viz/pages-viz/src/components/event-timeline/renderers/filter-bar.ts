import { html, css } from 'lit';
import type { TemplateResult } from 'lit';

export function renderFilterBar(
  categories: string[],
  activeFilters: Set<string>,
  onToggle: (category: string) => void,
): TemplateResult {
  return html`
    <div class="filter-bar" role="group" aria-label="Filter">
      ${categories.map(cat => html`
        <button
          class="filter-chip"
          role="checkbox"
          aria-checked="${activeFilters.has(cat)}"
          @click=${() => { onToggle(cat); }}
        >${cat}</button>
      `)}
    </div>
  `;
}

export const filterBarStyles = css`
  .filter-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .filter-chip {
    padding: 6px 12px;
    border-radius: 16px;
    border: 1px solid var(--pages-neutral-6, #d1d5db);
    background: var(--pages-neutral-1, #fff);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }
  .filter-chip[aria-checked="true"] {
    background: var(--pages-accent-9, #2563eb);
    color: white;
    border-color: var(--pages-accent-9, #2563eb);
  }
  .filter-chip:hover { border-color: var(--pages-accent-7, #3b82f6); }
`;
