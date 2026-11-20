import { describe, it, expect } from 'vitest';
import { COMPONENT_CATALOG, getFilteredCatalog, getCatalogCategories } from './component-catalog.js';
import type { PaletteContext } from './palette-context.js';

const ALL_COMPONENT_TYPES = [
  'grid', 'columns', 'rows', 'stack', 'tabs', 'pills', 'sidebar', 'tree',
  'menu', 'accordion', 'carousel', 'split', 'dock-bar', 'host-panel',
  'floating-workspace', 'panel', 'html', 'markdown', 'title', 'lazy-page',
  'page', 'bar-chart', 'line-chart', 'area-chart', 'pie-chart',
  'scatter-chart', 'bubble-chart', 'timeseries', 'heatmap-chart',
  'treemap-chart', 'density-heatmap', 'metric-grid', 'data-table',
  'grid-table', 'metric', 'meter', 'selector', 'map', 'badge', 'countdown',
  'timeline', 'graph', 'event-timeline', 'grouped-view', 'iframe-plugin',
  'input', 'number-input', 'select', 'checkbox', 'date-picker', 'textarea',
  'schema-form', 'action-button', 'form-scope', 'submit-button',
];

describe('ComponentCatalog', () => {
  it('has entries for all component types in componentSchema', () => {
    const catalogTypes = new Set(COMPONENT_CATALOG.map(e => e.type));
    for (const type of ALL_COMPONENT_TYPES) {
      expect(catalogTypes.has(type), `missing catalog entry for "${type}"`).toBe(true);
    }
  });

  it('has no duplicate types', () => {
    const types = COMPONENT_CATALOG.map(e => e.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('all entries have required fields', () => {
    for (const entry of COMPONENT_CATALOG) {
      expect(entry.type, `entry missing type`).toBeTruthy();
      expect(entry.label, `${entry.type} missing label`).toBeTruthy();
      expect(entry.category, `${entry.type} missing category`).toBeTruthy();
      expect(entry.icon, `${entry.type} missing icon`).toBeTruthy();
      expect(entry.description, `${entry.type} missing description`).toBeTruthy();
      expect(entry.defaultProps, `${entry.type} missing defaultProps`).toBeDefined();
      expect(typeof entry.contextRelevance, `${entry.type} missing contextRelevance`).toBe('function');
    }
  });

  it('does not include graph-canvas', () => {
    const types = COMPONENT_CATALOG.map(e => e.type);
    expect(types).not.toContain('graph-canvas');
  });
});

describe('getCatalogCategories', () => {
  it('returns categories in insertion order', () => {
    const categories = getCatalogCategories();
    expect(categories[0]).toBe('Layout');
    expect(categories.length).toBeGreaterThanOrEqual(8);
  });

  it('has no duplicates', () => {
    const categories = getCatalogCategories();
    expect(new Set(categories).size).toBe(categories.length);
  });
});

describe('getFilteredCatalog', () => {
  it('promotes form components inside form-scope', () => {
    const ctx: PaletteContext = {
      parentType: 'form-scope',
      acceptsComponents: true,
      availableDatasets: ['ds1'],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    const promoted = filtered.filter(e => e.relevance === 'promoted');
    expect(promoted.some(e => e.entry.type === 'input')).toBe(true);
    expect(promoted.some(e => e.entry.type === 'select')).toBe(true);
    expect(promoted.some(e => e.entry.type === 'submit-button')).toBe(true);
  });

  it('promotes metric inside metric-grid', () => {
    const ctx: PaletteContext = {
      parentType: 'metric-grid',
      acceptsComponents: true,
      availableDatasets: ['ds1'],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    const promoted = filtered.filter(e => e.relevance === 'promoted');
    expect(promoted.some(e => e.entry.type === 'metric')).toBe(true);
  });

  it('flags data components when no datasets available', () => {
    const ctx: PaletteContext = {
      parentType: undefined,
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    const prereq = filtered.filter(e => e.relevance === 'needs-prereq');
    expect(prereq.some(e => e.entry.type === 'bar-chart')).toBe(true);
    expect(prereq.some(e => e.entry.type === 'data-table')).toBe(true);
    expect(prereq.some(e => e.entry.type === 'metric')).toBe(true);
    expect(prereq.some(e => e.entry.type === 'selector')).toBe(true);
  });

  it('shows data components as normal when datasets exist', () => {
    const ctx: PaletteContext = {
      parentType: undefined,
      acceptsComponents: true,
      availableDatasets: ['sales_tx'],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    const barChart = filtered.find(e => e.entry.type === 'bar-chart');
    expect(barChart?.relevance).toBe('normal');
  });

  it('hides page-level-only types when inside a container', () => {
    const ctx: PaletteContext = {
      parentType: 'tabs',
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    const types = filtered.map(e => e.entry.type);
    expect(types).not.toContain('page');
    expect(types).not.toContain('lazy-page');
  });

  it('shows page-level types at root level', () => {
    const ctx: PaletteContext = {
      parentType: undefined,
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    const types = filtered.map(e => e.entry.type);
    expect(types).toContain('page');
    expect(types).toContain('lazy-page');
  });

  it('hides all components when acceptsComponents false and layout-blocked parent', () => {
    const ctx: PaletteContext = {
      parentType: 'row',
      acceptsComponents: false,
      availableDatasets: ['ds1'],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    expect(filtered).toHaveLength(0);
  });

  it('shows layout types even when acceptsComponents is false (no blocked parent)', () => {
    const ctx: PaletteContext = {
      parentType: undefined,
      acceptsComponents: false,
      availableDatasets: ['ds1'],
      siblingTypes: [],
    };
    const filtered = getFilteredCatalog(ctx);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(r => ['rows', 'columns', 'grid'].includes(r.entry.type))).toBe(true);
  });

  it('data components have prereqHint set', () => {
    const barChart = COMPONENT_CATALOG.find(e => e.type === 'bar-chart');
    expect(barChart?.prereqHint).toBeTruthy();
  });

  it('hard-filters when allowedTypes has no component types', () => {
    const ctx: PaletteContext = {
      parentType: 'row',
      acceptsComponents: false,
      availableDatasets: [],
      siblingTypes: [],
      allowedTypes: { structuralTypes: ['column'], componentTypes: [] },
    };
    const entries = getFilteredCatalog(ctx);
    expect(entries.length).toBe(0);
  });

  it('hard-filters to only allowed component types', () => {
    const ctx: PaletteContext = {
      parentType: 'column',
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
      allowedTypes: {
        structuralTypes: [],
        componentTypes: ['bar-chart', 'input', 'title'],
      },
    };
    const entries = getFilteredCatalog(ctx);
    const types = entries.map(e => e.entry.type);
    expect(types).toContain('bar-chart');
    expect(types).toContain('input');
    expect(types).toContain('title');
    expect(types).not.toContain('pie-chart');
    expect(types).not.toContain('data-table');
  });

  it('contextRelevance still applies within allowed types', () => {
    const ctx: PaletteContext = {
      parentType: 'column',
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
      allowedTypes: {
        structuralTypes: [],
        componentTypes: ['bar-chart', 'title'],
      },
    };
    const entries = getFilteredCatalog(ctx);
    const barChart = entries.find(e => e.entry.type === 'bar-chart');
    expect(barChart?.relevance).toBe('needs-prereq');
  });
});
