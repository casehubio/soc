import { describe, it, expect } from 'vitest';
import { createDefaultRegistry } from './preview-data-registry.js';
import { COMPONENT_CATALOG } from '../catalog/component-catalog.js';
import { PageDocument } from '@casehubio/pages-document';

const NEEDS_DATASET_TYPES = new Set([
  'bar-chart', 'line-chart', 'area-chart', 'pie-chart',
  'scatter-chart', 'bubble-chart', 'timeseries',
  'heatmap-chart', 'treemap-chart', 'density-heatmap',
  'data-table', 'grid-table', 'grouped-view',
  'metric', 'meter', 'selector', 'map',
  'timeline', 'graph', 'event-timeline',
]);

describe('PreviewDataRegistry', () => {
  it('returns strategy for all NEEDS_DATASET_TYPES', () => {
    const registry = createDefaultRegistry();
    for (const type of NEEDS_DATASET_TYPES) {
      expect(registry.get(type), `missing strategy for ${type}`).toBeDefined();
    }
  });

  it('returns undefined for non-data types', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('html')).toBeUndefined();
    expect(registry.get('tabs')).toBeUndefined();
    expect(registry.get('input')).toBeUndefined();
    expect(registry.get('split')).toBeUndefined();
  });

  it('has exactly 20 registered types', () => {
    const registry = createDefaultRegistry();
    expect(registry.size).toBe(20);
  });
});

describe('ChartDataStrategy', () => {
  it('generates rows from dataset column definitions', () => {
    const registry = createDefaultRegistry();
    const strategy = registry.get('bar-chart')!;
    const doc = PageDocument.parse(`datasets:
  - uuid: sales
    columns:
      - { id: region, type: TEXT }
      - { id: revenue, type: NUMBER }`);
    const datasets = doc.getDatasets();
    const snapshots = strategy.generate({ lookup: { uuid: 'sales' } }, datasets);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.uuid).toBe('sales');
    expect(snapshots[0]!.rows.length).toBeGreaterThanOrEqual(5);
    expect(typeof snapshots[0]!.rows[0]!['region']).toBe('string');
    expect(typeof snapshots[0]!.rows[0]!['revenue']).toBe('number');
  });

  it('falls back to generic data when no column definitions', () => {
    const registry = createDefaultRegistry();
    const strategy = registry.get('bar-chart')!;
    const doc = PageDocument.parse(`datasets:\n  - uuid: sales\n    url: /api`);
    const snapshots = strategy.generate({ lookup: { uuid: 'sales' } }, doc.getDatasets());
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.rows.length).toBeGreaterThanOrEqual(5);
    expect(snapshots[0]!.rows[0]!['category']).toBeDefined();
  });

  it('returns empty when no matching dataset', () => {
    const registry = createDefaultRegistry();
    const strategy = registry.get('bar-chart')!;
    const snapshots = strategy.generate({ lookup: { uuid: 'missing' } }, []);
    expect(snapshots).toHaveLength(0);
  });

  it('returns empty when no lookup prop', () => {
    const registry = createDefaultRegistry();
    const strategy = registry.get('bar-chart')!;
    const snapshots = strategy.generate({}, []);
    expect(snapshots).toHaveLength(0);
  });
});

describe('TableDataStrategy', () => {
  it('generates rows with edge cases', () => {
    const registry = createDefaultRegistry();
    const strategy = registry.get('data-table')!;
    const doc = PageDocument.parse(`datasets:
  - uuid: users
    columns:
      - { id: name, type: TEXT }
      - { id: score, type: NUMBER }`);
    const snapshots = strategy.generate({ lookup: { uuid: 'users' } }, doc.getDatasets());
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.rows.length).toBeGreaterThanOrEqual(10);
    const scores = snapshots[0]!.rows.map(r => r['score']);
    expect(scores.some(s => s === null)).toBe(true);
  });
});

describe('MetricDataStrategy', () => {
  it('generates a single row', () => {
    const registry = createDefaultRegistry();
    const strategy = registry.get('metric')!;
    const doc = PageDocument.parse(`datasets:\n  - uuid: kpi\n    url: /api`);
    const snapshots = strategy.generate({ lookup: { uuid: 'kpi' } }, doc.getDatasets());
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.rows).toHaveLength(1);
  });
});

describe('PreviewHints on catalog', () => {
  it('container types have sampleChildren', () => {
    const containers = ['tabs', 'accordion', 'sidebar', 'stack', 'carousel'];
    for (const type of containers) {
      const entry = COMPONENT_CATALOG.find(e => e.type === type)!;
      expect(entry.previewHints?.sampleChildren, `${type} missing sampleChildren`).toBeGreaterThan(0);
    }
  });

  it('html and markdown have placeholderText', () => {
    for (const type of ['html', 'markdown']) {
      const entry = COMPONENT_CATALOG.find(e => e.type === type)!;
      expect(entry.previewHints?.placeholderText, `${type} missing placeholderText`).toBeDefined();
    }
  });

  it('data types do not have previewHints', () => {
    const entry = COMPONENT_CATALOG.find(e => e.type === 'bar-chart')!;
    expect(entry.previewHints).toBeUndefined();
  });
});
