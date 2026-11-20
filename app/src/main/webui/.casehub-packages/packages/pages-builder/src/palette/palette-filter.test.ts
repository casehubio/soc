import { describe, it, expect } from 'vitest';
import { filterCatalog } from './palette-filter.js';
import type { PaletteContext } from '../catalog/palette-context.js';

const BASE_CTX: PaletteContext = {
  parentType: undefined,
  acceptsComponents: true,
  availableDatasets: ['ds1'],
  siblingTypes: [],
};

describe('filterCatalog', () => {
  it('returns entries with relevance scores', () => {
    const results = filterCatalog(BASE_CTX);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.entry).toBeDefined();
    expect(results[0]!.relevance).toBeDefined();
  });

  it('filters by search term', () => {
    const results = filterCatalog(BASE_CTX, { search: 'bar' });
    expect(results.every(r =>
      r.entry.label.toLowerCase().includes('bar') ||
      r.entry.type.toLowerCase().includes('bar') ||
      r.entry.description.toLowerCase().includes('bar')
    )).toBe(true);
  });

  it('filters by category', () => {
    const results = filterCatalog(BASE_CTX, { category: 'Charts' });
    expect(results.every(r => r.entry.category === 'Charts')).toBe(true);
  });

  it('promotes form components inside form-scope', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      parentType: 'form-scope',
    };
    const results = filterCatalog(ctx);
    const promoted = results.filter(r => r.relevance === 'promoted');
    expect(promoted.some(r => r.entry.type === 'input')).toBe(true);
  });

  it('hides page-level-only components inside containers', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      parentType: 'tabs',
      parentSlot: 'Tab 1',
    };
    const results = filterCatalog(ctx);
    expect(results.find(r => r.entry.type === 'page')).toBeUndefined();
  });

  it('marks data components as needs-prereq when no datasets', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      availableDatasets: [],
    };
    const results = filterCatalog(ctx);
    const barChart = results.find(r => r.entry.type === 'bar-chart')!;
    expect(barChart.relevance).toBe('needs-prereq');
  });

  it('sorts promoted first, needs-prereq last', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      parentType: 'form-scope',
    };
    const results = filterCatalog(ctx);
    const firstPromotedIdx = results.findIndex(r => r.relevance === 'promoted');
    const lastNormalIdx = results.length - 1 - [...results].reverse().findIndex(r => r.relevance === 'normal');
    if (firstPromotedIdx >= 0 && results.some(r => r.relevance === 'normal')) {
      expect(firstPromotedIdx).toBeLessThan(lastNormalIdx);
    }
  });

  it('combines search and category', () => {
    const results = filterCatalog(BASE_CTX, { search: 'bar', category: 'Charts' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.entry.category === 'Charts')).toBe(true);
  });

  it('hides layout types when parentType is column', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      parentType: 'column',
    };
    const results = filterCatalog(ctx);
    expect(results.find(r => r.entry.type === 'rows')).toBeUndefined();
    expect(results.find(r => r.entry.type === 'columns')).toBeUndefined();
    expect(results.find(r => r.entry.type === 'grid')).toBeUndefined();
    expect(results.find(r => r.entry.type === 'bar-chart')).toBeDefined();
  });

  it('acceptsComponents false hides regular components but keeps layout types visible', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      acceptsComponents: false,
    };
    const results = filterCatalog(ctx);
    expect(results.find(r => r.entry.type === 'bar-chart')).toBeUndefined();
    expect(results.find(r => r.entry.type === 'metric')).toBeUndefined();
    expect(results.find(r => r.entry.type === 'rows')).toBeDefined();
    expect(results.find(r => r.entry.type === 'grid')).toBeDefined();
  });

  it('acceptsComponents false with layout-blocked parent hides everything', () => {
    const ctx: PaletteContext = {
      ...BASE_CTX,
      acceptsComponents: false,
      parentType: 'row',
    };
    const results = filterCatalog(ctx);
    expect(results).toHaveLength(0);
  });
});
