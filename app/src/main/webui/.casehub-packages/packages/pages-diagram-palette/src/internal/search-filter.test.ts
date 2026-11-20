import { describe, it, expect } from 'vitest';
import { filterItems, groupItems } from './search-filter.js';
import type { PaletteItem } from '../types.js';

const items: PaletteItem[] = [
  { type: 'source', label: 'Source', icon: '⬇', group: 'Input' },
  { type: 'transform', label: 'Transform', icon: '⚙', group: 'Processing' },
  { type: 'filter', label: 'Filter', icon: '⧖', group: 'Processing' },
  { type: 'sink', label: 'Sink', icon: '⬆', group: 'Output' },
  { type: 'join', label: 'Join', icon: '⨝' },
];

describe('filterItems', () => {
  it('returns all items for empty query', () => {
    expect(filterItems(items, '')).toEqual(items);
  });

  it('filters by label substring case-insensitive', () => {
    const result = filterItems(items, 'trans');
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('transform');
  });

  it('filters by type', () => {
    const result = filterItems(items, 'sink');
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('sink');
  });

  it('filters by group', () => {
    const result = filterItems(items, 'processing');
    expect(result).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    expect(filterItems(items, 'zzz')).toHaveLength(0);
  });
});

describe('groupItems', () => {
  it('groups by group field', () => {
    const groups = groupItems(items);
    expect(groups.get('Input')!).toHaveLength(1);
    expect(groups.get('Processing')!).toHaveLength(2);
    expect(groups.get('Output')!).toHaveLength(1);
  });

  it('puts ungrouped items under empty string key', () => {
    const groups = groupItems(items);
    expect(groups.get('')!).toHaveLength(1);
    expect(groups.get('')![0]!.type).toBe('join');
  });

  it('returns empty map for empty input', () => {
    expect(groupItems([])).toEqual(new Map());
  });
});
