import { describe, it, expect } from 'vitest';
import { PageDocument } from '@casehubio/pages-document';
import { collectComponentsInScope } from './scope-collector.js';

const ROWS_YAML = `pages:
- name: Dashboard
  rows:
  - columns:
    - span: 4
      components:
      - type: metric
        properties:
          title: Total Revenue
          lookup:
            uuid: sales_tx
    - span: 8
      components:
      - type: bar-chart
        properties:
          title: Revenue Chart
          lookup:
            uuid: sales_tx
  - columns:
    - span: 12
      components:
      - type: data-table
        properties:
          title: Transactions
          lookup:
            uuid: sales_tx
- name: Settings
  components:
  - type: title
    properties:
      text: Settings
  - type: markdown
datasets:
- uuid: sales_tx
  name: Sales
`;

describe('collectComponentsInScope', () => {
  describe('page scope', () => {
    it('collects all components on a page with rows layout', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0], 'page');
      expect(comps).toHaveLength(3);
      expect(comps.map(c => c.type)).toEqual(['metric', 'bar-chart', 'data-table']);
    });

    it('collects all components on a flat page', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 1], 'page');
      expect(comps).toHaveLength(2);
      expect(comps.map(c => c.type)).toEqual(['title', 'markdown']);
    });
  });

  describe('row scope', () => {
    it('collects all components in a row (across columns)', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0, 'rows', 0], 'row');
      expect(comps).toHaveLength(2);
      expect(comps.map(c => c.type)).toEqual(['metric', 'bar-chart']);
    });

    it('second row has only the data-table', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0, 'rows', 1], 'row');
      expect(comps).toHaveLength(1);
      expect(comps[0]!.type).toBe('data-table');
    });
  });

  describe('column scope', () => {
    it('collects only components in the specified column', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0, 'rows', 0, 'columns', 0], 'column');
      expect(comps).toHaveLength(1);
      expect(comps[0]!.type).toBe('metric');
    });

    it('second column has only bar-chart', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0, 'rows', 0, 'columns', 1], 'column');
      expect(comps).toHaveLength(1);
      expect(comps[0]!.type).toBe('bar-chart');
    });
  });

  describe('component scope', () => {
    it('collects exactly one component', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc,
        ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], 'component');
      expect(comps).toHaveLength(1);
      expect(comps[0]!.type).toBe('metric');
    });

    it('flat page component scope', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc,
        ['pages', 1, 'components', 0], 'component');
      expect(comps).toHaveLength(1);
      expect(comps[0]!.type).toBe('title');
    });
  });

  describe('dataset scope', () => {
    it('collects all components referencing the dataset', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['datasets', 0], 'dataset');
      expect(comps).toHaveLength(3);
      expect(comps.map(c => c.type)).toEqual(['metric', 'bar-chart', 'data-table']);
    });
  });

  describe('invariant: scope always returns a contiguous set', () => {
    it('page scope components are all from the same page', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0], 'page');
      for (const c of comps) {
        expect(c.path[0]).toBe('pages');
        expect(c.path[1]).toBe(0);
      }
    });

    it('row scope components are all from the same row', () => {
      const doc = PageDocument.parse(ROWS_YAML);
      const comps = collectComponentsInScope(doc, ['pages', 0, 'rows', 0], 'row');
      for (const c of comps) {
        expect(c.path[3]).toBe(0);
      }
    });
  });
});
