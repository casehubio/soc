import type { PaletteItem } from '../types.js';

export function filterItems(
  items: readonly PaletteItem[],
  query: string,
): PaletteItem[] {
  if (!query) return [...items];
  const lower = query.toLowerCase();
  return items.filter(
    item =>
      item.label.toLowerCase().includes(lower) ||
      item.type.toLowerCase().includes(lower) ||
      (item.group?.toLowerCase().includes(lower) ?? false),
  );
}

export function groupItems(
  items: readonly PaletteItem[],
): Map<string, PaletteItem[]> {
  const groups = new Map<string, PaletteItem[]>();
  for (const item of items) {
    const key = item.group ?? '';
    const list = groups.get(key);
    if (list) {
      list.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}
