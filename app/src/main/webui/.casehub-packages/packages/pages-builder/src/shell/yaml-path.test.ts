import { describe, it, expect } from 'vitest';
import { PageDocument } from '@casehubio/pages-document';
import { findPathAtOffset, getNodeRange, classifyPath, getParentPath } from './yaml-path.js';

const FLAT_PAGE = `pages:
- name: Overview
  components:
  - type: title
    properties:
      text: Hello
  - type: bar-chart
    properties:
      subtype: column
`;

const ROWS_PAGE = `pages:
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
    - span: 4
      components:
      - type: metric
        properties:
          title: Active Users
          lookup:
            uuid: analytics
  - columns:
    - span: 8
      components:
      - type: bar-chart
        properties:
          subtype: column
`;

const WITH_DATASETS = `datasets:
- uuid: sales_tx
  name: Sales Transactions
  url: /api/sales
- uuid: analytics
  name: Analytics
pages:
- name: P
`;

const WITH_NAV = `pages:
- name: P
navTree:
  root_items:
  - type: GROUP
    id: main
    children:
    - type: ITEM
      page: P
`;

function offsetIn(doc: PageDocument, substring: string): number {
  return doc.toString().indexOf(substring);
}

// --- findPathAtOffset ---

describe('findPathAtOffset', () => {
  describe('flat page components', () => {
    it('cursor on "type: title" resolves to first component', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'type: title'));
      expect(path).toEqual(['pages', 0, 'components', 0]);
    });

    it('cursor on "type: bar-chart" resolves to second component', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'type: bar-chart'));
      expect(path).toEqual(['pages', 0, 'components', 1]);
    });

    it('cursor on "text: Hello" trims to first component', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'text: Hello'));
      expect(path).toEqual(['pages', 0, 'components', 0]);
    });

    it('cursor on "subtype: column" trims to second component', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'subtype: column'));
      expect(path).toEqual(['pages', 0, 'components', 1]);
    });
  });

  describe('rows/columns layout', () => {
    it('cursor on first "type: metric" resolves to first row first column component', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'type: metric'));
      expect(path).toEqual(['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
    });

    it('cursor on "title: Active Users" resolves to second column component', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'title: Active Users'));
      expect(path).toEqual(['pages', 0, 'rows', 0, 'columns', 1, 'components', 0]);
    });

    it('cursor on "type: bar-chart" resolves to second row component', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'type: bar-chart'));
      expect(path).toBeDefined();
      expect(path![path!.indexOf('rows') + 1]).toBe(1);
    });

    it('cursor on "span: 4" resolves to a column', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'span: 4'));
      expect(path).toBeDefined();
      expect(path).toContain('columns');
    });

    it('cursor on "name: Dashboard" resolves to the page', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const path = findPathAtOffset(doc, offsetIn(doc, 'name: Dashboard'));
      expect(path).toEqual(['pages', 0]);
    });
  });

  describe('datasets', () => {
    it('cursor on first dataset resolves to datasets[0]', () => {
      const doc = PageDocument.parse(WITH_DATASETS);
      const path = findPathAtOffset(doc, offsetIn(doc, 'uuid: sales_tx'));
      expect(path).toEqual(['datasets', 0]);
    });

    it('cursor on second dataset resolves to datasets[1]', () => {
      const doc = PageDocument.parse(WITH_DATASETS);
      const path = findPathAtOffset(doc, offsetIn(doc, 'uuid: analytics'));
      expect(path).toEqual(['datasets', 1]);
    });
  });

  describe('navigation', () => {
    it('cursor on nav item resolves to navTree path', () => {
      const doc = PageDocument.parse(WITH_NAV);
      const path = findPathAtOffset(doc, offsetIn(doc, 'id: main'));
      expect(path).toBeDefined();
      expect(path![0]).toBe('navTree');
    });
  });

  describe('edge cases', () => {
    it('offset 0 returns root-level path', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const path = findPathAtOffset(doc, 0);
      expect(path).toBeDefined();
    });

    it('offset at end of file returns a path', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const text = doc.toString();
      const path = findPathAtOffset(doc, text.length - 1);
      expect(path).toBeDefined();
    });
  });

  describe('demo YAML — correlations', () => {
    const DEMO_YAML = `pages:\n- name: Sales Dashboard\n  rows:\n  - columns:\n    - span: 4\n      components:\n      - type: metric\n        properties:\n          title: Total Revenue\n          lookup:\n            uuid: sales_tx\n    - span: 4\n      components:\n      - type: metric\n        properties:\n          title: Active Users\n          lookup:\n            uuid: analytics\n`;

    it('first uuid: sales_tx resolves to Total Revenue component', () => {
      const doc = PageDocument.parse(DEMO_YAML);
      const path = findPathAtOffset(doc, offsetIn(doc, 'uuid: sales_tx'));
      expect(path).toBeDefined();
      expect(classifyPath(path!)).toBe('component');
      expect(path![path!.indexOf('columns') + 1]).toBe(0);
    });

    it('Total Revenue range does not include Active Users', () => {
      const doc = PageDocument.parse(DEMO_YAML);
      const path = findPathAtOffset(doc, offsetIn(doc, 'uuid: sales_tx'));
      const range = getNodeRange(doc, path!);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('Total Revenue');
      expect(text).not.toContain('Active Users');
    });

    it('Active Users range does not include Total Revenue', () => {
      const doc = PageDocument.parse(DEMO_YAML);
      const path = findPathAtOffset(doc, offsetIn(doc, 'title: Active Users'));
      const range = getNodeRange(doc, path!);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('Active Users');
      expect(text).not.toContain('Total Revenue');
    });
  });
});

// --- getNodeRange ---

describe('getNodeRange', () => {
  describe('component ranges are precise', () => {
    it('first component range does not overlap second component', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const r0 = getNodeRange(doc, ['pages', 0, 'components', 0]);
      const r1 = getNodeRange(doc, ['pages', 0, 'components', 1]);
      expect(r0).toBeDefined();
      expect(r1).toBeDefined();
      expect(r0!.to).toBeLessThanOrEqual(r1!.from);
    });

    it('component range includes its properties', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'components', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('type: title');
      expect(text).toContain('text: Hello');
    });

    it('component range does NOT include sibling components', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'components', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).not.toContain('bar-chart');
    });
  });

  describe('row/column ranges', () => {
    it('first metric range does not overlap second metric', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const r0 = getNodeRange(doc, ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
      const r1 = getNodeRange(doc, ['pages', 0, 'rows', 0, 'columns', 1, 'components', 0]);
      expect(r0).toBeDefined();
      expect(r1).toBeDefined();
      expect(r0!.to).toBeLessThanOrEqual(r1!.from);
    });

    it('metric range includes its lookup.uuid', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('title: Total Revenue');
      expect(text).toContain('uuid: sales_tx');
    });

    it('column range includes its components but not sibling columns', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'rows', 0, 'columns', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('Total Revenue');
      expect(text).not.toContain('Active Users');
    });

    it('row range includes all its columns', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'rows', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('Total Revenue');
      expect(text).toContain('Active Users');
    });

    it('row range does not include second row', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'rows', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).not.toContain('bar-chart');
    });

    it('component range ends on the last content line, not the next line', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
      expect(range).toBeDefined();
      const yaml = doc.toString();
      const lastLine = yaml.slice(0, range!.to).split('\n').pop()!;
      expect(lastLine.trim()).not.toBe('');
      expect(lastLine).toContain('uuid: sales_tx');
    });

    it('range from starts on the same line as the node content', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
      expect(range).toBeDefined();
      const yaml = doc.toString();
      const startLine = yaml.slice(0, range!.from).split('\n').length;
      const textFromStart = yaml.split('\n')[startLine - 1]!;
      expect(textFromStart.trim()).toMatch(/^-?\s*type:/);
    });
  });

  describe('page and dataset ranges', () => {
    it('page range includes all rows', () => {
      const doc = PageDocument.parse(ROWS_PAGE);
      const range = getNodeRange(doc, ['pages', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('Dashboard');
      expect(text).toContain('bar-chart');
    });

    it('dataset range includes its fields but not the next dataset', () => {
      const doc = PageDocument.parse(WITH_DATASETS);
      const range = getNodeRange(doc, ['datasets', 0]);
      expect(range).toBeDefined();
      const text = doc.toString().slice(range!.from, range!.to);
      expect(text).toContain('sales_tx');
      expect(text).toContain('Sales Transactions');
      expect(text).not.toContain('analytics');
    });
  });

  describe('invalid paths', () => {
    it('returns null for non-existent path', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      expect(getNodeRange(doc, ['pages', 99])).toBeNull();
    });

    it('returns null for empty path', () => {
      const doc = PageDocument.parse(FLAT_PAGE);
      expect(getNodeRange(doc, [])).toBeNull();
    });
  });
});

// --- classifyPath ---

describe('classifyPath', () => {
  it('classifies page path', () => {
    expect(classifyPath(['pages', 0])).toBe('page');
    expect(classifyPath(['pages', 1])).toBe('page');
  });

  it('classifies row path', () => {
    expect(classifyPath(['pages', 0, 'rows', 0])).toBe('row');
  });

  it('classifies column path', () => {
    expect(classifyPath(['pages', 0, 'columns', 0])).toBe('column');
    expect(classifyPath(['pages', 0, 'rows', 0, 'columns', 0])).toBe('column');
  });

  it('classifies component path', () => {
    expect(classifyPath(['pages', 0, 'components', 0])).toBe('component');
    expect(classifyPath(['pages', 0, 'rows', 0, 'columns', 0, 'components', 0])).toBe('component');
    expect(classifyPath(['pages', 0, 'columns', 0, 'components', 0])).toBe('component');
  });

  it('classifies dataset path', () => {
    expect(classifyPath(['datasets', 0])).toBe('dataset');
  });

  it('classifies nav path', () => {
    expect(classifyPath(['navTree', 'root_items', 0])).toBe('nav-item');
    expect(classifyPath(['navTree', 'root_items', 0, 'children', 0])).toBe('nav-item');
  });

  it('returns undefined for property paths (should resolve to parent)', () => {
    expect(classifyPath(['pages', 0, 'components', 0, 'properties', 'text'])).toBe('component');
    expect(classifyPath(['pages', 0, 'rows', 0, 'columns', 0, 'components', 0, 'properties'])).toBe('component');
  });

  it('returns undefined for unrecognised paths', () => {
    expect(classifyPath([])).toBeUndefined();
    expect(classifyPath(['unknown'])).toBeUndefined();
  });
});

// --- getParentPath ---

describe('getParentPath', () => {
  it('component → column', () => {
    expect(getParentPath(['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]))
      .toEqual(['pages', 0, 'rows', 0, 'columns', 0]);
  });

  it('column → row', () => {
    expect(getParentPath(['pages', 0, 'rows', 0, 'columns', 0]))
      .toEqual(['pages', 0, 'rows', 0]);
  });

  it('row → page', () => {
    expect(getParentPath(['pages', 0, 'rows', 0]))
      .toEqual(['pages', 0]);
  });

  it('page → pages section', () => {
    expect(getParentPath(['pages', 0])).toEqual(['pages']);
  });

  it('pages section → null (root)', () => {
    expect(getParentPath(['pages'])).toBeNull();
  });

  it('flat component → page', () => {
    expect(getParentPath(['pages', 0, 'components', 0]))
      .toEqual(['pages', 0]);
  });

  it('dataset → datasets section', () => {
    expect(getParentPath(['datasets', 0])).toEqual(['datasets']);
  });

  it('datasets section → null', () => {
    expect(getParentPath(['datasets'])).toBeNull();
  });

  it('nav child → nav parent', () => {
    expect(getParentPath(['navTree', 'root_items', 0, 'children', 0]))
      .toEqual(['navTree', 'root_items', 0]);
  });

  it('nav root item → navTree section', () => {
    expect(getParentPath(['navTree', 'root_items', 0])).toEqual(['navTree']);
  });

  it('empty → null', () => {
    expect(getParentPath([])).toBeNull();
  });

  it('full chain: component → column → row → page → section → null', () => {
    let path: readonly (string | number)[] | null = ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0];
    const chain: string[] = [classifyPath(path)!];
    while (path) {
      path = getParentPath(path);
      if (path) chain.push(classifyPath(path)!);
    }
    expect(chain).toEqual(['component', 'column', 'row', 'page', 'section']);
  });
});
