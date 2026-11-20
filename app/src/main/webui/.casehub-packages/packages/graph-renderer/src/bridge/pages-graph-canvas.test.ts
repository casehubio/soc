import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@casehubio/pages-ui-tokens', () => ({
  applyTheme: vi.fn(),
  getTheme: vi.fn(() => ''),
  listThemes: vi.fn(() => ['default-light']),
  registerTheme: vi.fn(),
}));

vi.mock('../layout/elk-layout.js', () => ({
  computeElkLayout: vi.fn(async (nodes: unknown[]) => nodes),
}));

import './PagesGraphCanvas.js';
import type { PagesGraphCanvas } from './PagesGraphCanvas.js';
import type { GraphCanvasProps } from '@casehubio/pages-component';
import { ColumnType, columnId } from '@casehubio/pages-data';
import type { TypedDataSet, TypedRow, CellValue, ColumnId } from '@casehubio/pages-data';

function props(overrides: Partial<Record<string, unknown>>): GraphCanvasProps {
  return overrides as unknown as GraphCanvasProps;
}

function textCell(value: string): CellValue {
  return { type: ColumnType.TEXT, value };
}

function textRow(cells: string[]): TypedRow {
  const cellValues = cells.map(textCell);
  return {
    cells: cellValues,
    cell: (_id: ColumnId) => cellValues[0] as CellValue,
    number: () => 0,
    text: (id: ColumnId) => {
      const idx = id === columnId('from') ? 0 : 1;
      return cellValues[idx]?.type === ColumnType.TEXT ? (cellValues[idx] as { value: string }).value : '';
    },
    date: () => new Date(),
  };
}

function testDataSet(rows: string[][]): TypedDataSet {
  return {
    columns: [
      { id: columnId('from'), name: 'from', type: ColumnType.TEXT },
      { id: columnId('to'), name: 'to', type: ColumnType.TEXT },
    ],
    rows: rows.map(r => textRow(r)),
  };
}

describe('PagesGraphCanvas', () => {
  let element: PagesGraphCanvas;

  beforeEach(() => {
    element = document.createElement('pages-graph-canvas') as PagesGraphCanvas;
  });

  afterEach(() => {
    element.remove();
  });

  it('registers as pages-graph-canvas custom element', () => {
    expect(customElements.get('pages-graph-canvas')).toBeDefined();
  });

  it('accepts props property', () => {
    const p = props({
      sourceColumn: 'src',
      targetColumn: 'tgt',
      direction: 'RIGHT',
    });
    element.props = p;
    expect(element.props).toBe(p);
  });

  it('maps algorithm "tree" to ELK "mrtree"', () => {
    element.props = props({ algorithm: 'tree' });
    const opts = element.buildLayoutOptions();
    expect(opts?.algorithm).toBe('mrtree');
  });

  it('maps algorithm "layered" unchanged', () => {
    element.props = props({ algorithm: 'layered' });
    const opts = element.buildLayoutOptions();
    expect(opts?.algorithm).toBe('layered');
  });

  it('returns undefined layout options when no props', () => {
    expect(element.buildLayoutOptions()).toBeUndefined();
  });

  it('passes elk extension options through', () => {
    element.props = props({ elk: { wrapping: true, headerHeight: 40 } });
    const opts = element.buildLayoutOptions();
    expect(opts?.wrapping).toBe(true);
    expect(opts?.headerHeight).toBe(40);
  });

  it('builds model from dataSet', () => {
    element.props = props({ sourceColumn: 'from', targetColumn: 'to' });
    element.dataSet = testDataSet([['A', 'B'], ['B', 'C']]);
    const model = (element as any).buildModel();
    expect(model).toBeDefined();
    expect(model.nodes).toHaveLength(3);
    expect(model.edges).toHaveLength(2);
    expect(model.edges[0].id).toBe('A->B');
  });

  it('uses directed edge type when directed is true', () => {
    element.props = props({ sourceColumn: 'from', targetColumn: 'to', directed: true });
    element.dataSet = testDataSet([['A', 'B']]);
    const model = (element as any).buildModel();
    expect(model.edges[0].type).toBe('directed');
  });

  it('returns undefined model without dataSet', () => {
    element.props = props({ sourceColumn: 'from', targetColumn: 'to' });
    const model = (element as any).buildModel();
    expect(model).toBeUndefined();
  });
});
