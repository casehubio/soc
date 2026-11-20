import { getFilteredCatalog, getCatalogCategories, type FilteredCatalogEntry } from '../catalog/component-catalog.js';
import type { PaletteContext } from '../catalog/palette-context.js';

export interface PaletteFilterOptions {
  search?: string;
  category?: string;
}

export function filterCatalog(
  ctx: PaletteContext,
  options: PaletteFilterOptions = {},
): readonly FilteredCatalogEntry[] {
  let entries = getFilteredCatalog(ctx);

  if (options.search) {
    const q = options.search.toLowerCase();
    entries = entries.filter(e =>
      e.entry.label.toLowerCase().includes(q) ||
      e.entry.type.toLowerCase().includes(q) ||
      e.entry.description.toLowerCase().includes(q)
    );
  }

  if (options.category) {
    entries = entries.filter(e => e.entry.category === options.category);
  }

  return [...entries].sort((a, b) => {
    const order = { promoted: 0, normal: 1, 'needs-prereq': 2, hidden: 3 };
    return (order[a.relevance] ?? 1) - (order[b.relevance] ?? 1);
  });
}

export { getCatalogCategories };
