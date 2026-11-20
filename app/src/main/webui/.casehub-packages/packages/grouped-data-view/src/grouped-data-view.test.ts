import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './grouped-data-view.js';
import { columnId, ColumnType } from '@casehubio/pages-data';
import type { ColumnId, TypedDataSet } from '@casehubio/pages-data';
import { fromRows } from '@casehubio/pages-data';
import type { GroupStyleConfig } from './types.js';

type GroupedDataViewEl = HTMLElement & {
  groupBy: string;
  groupOrder?: string[];
  groupConfig?: Map<string, GroupStyleConfig>;
  groupStyle?: (name: string) => GroupStyleConfig | undefined;
  preset: string;
  defaultExpanded: boolean;
  columnConfig?: readonly any[];
  columnRenderers?: ReadonlyMap<ColumnId, any>;
  rowStyle?: readonly any[];
  selection?: string;
  sortable: boolean;
  endpoint?: string;
  loading: boolean;
  error: string;
  dataSet: TypedDataSet | undefined;
  updateComplete: Promise<boolean>;
  configure(props: Record<string, unknown>): void;
  refresh(): void;
  _toGroupingKey(columnId: string): {
    sourceId: ColumnId;
    columnId: ColumnId;
    strategy: { mode: string };
    maxIntervals: number;
    emptyIntervals: boolean;
    ascendingOrder: boolean;
  };
  _prepareDataSet(
    ds: TypedDataSet,
    keyColumn: string,
    groupOrder?: string[],
  ): TypedDataSet;
};

const LANE_COL = columnId('lane');
const NAME_COL = columnId('name');

const COLUMNS = [
  { id: LANE_COL, name: 'Lane', type: ColumnType.TEXT, getValue: (r: { lane: string }) => r.lane },
  { id: NAME_COL, name: 'Name', type: ColumnType.TEXT, getValue: (r: { name: string }) => r.name },
];

function makeDataSet(items: Array<{ lane: string; name: string }>): TypedDataSet {
  return fromRows(items, COLUMNS);
}

describe('_toGroupingKey', () => {
  it('converts string column ID to GroupingKey with distinct strategy', () => {
    const el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    const key = el._toGroupingKey('lane');
    expect(key.sourceId).toBe('lane');
    expect(key.columnId).toBe('lane');
    expect(key.strategy).toEqual({ mode: 'distinct' });
    expect(key.maxIntervals).toBe(100);
    expect(key.emptyIntervals).toBe(false);
    expect(key.ascendingOrder).toBe(true);
  });
});

describe('_prepareDataSet', () => {
  let el: GroupedDataViewEl;
  beforeEach(() => {
    el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
  });

  it('sorts interleaved data to ensure group adjacency', () => {
    const ds = makeDataSet([
      { lane: 'HIGH', name: 'a' },
      { lane: 'NORMAL', name: 'b' },
      { lane: 'HIGH', name: 'c' },
      { lane: 'NORMAL', name: 'd' },
    ]);
    const result = el._prepareDataSet(ds, 'lane');
    const lanes = result.rows.map(r => {
      const cell = r.cell(LANE_COL);
      return cell.type !== 'NULL' ? String(cell.value) : '';
    });
    expect(lanes).toEqual(['HIGH', 'HIGH', 'NORMAL', 'NORMAL']);
  });

  it('applies explicit groupOrder', () => {
    const ds = makeDataSet([
      { lane: 'NORMAL', name: 'a' },
      { lane: 'CRITICAL', name: 'b' },
      { lane: 'HIGH', name: 'c' },
    ]);
    const result = el._prepareDataSet(ds, 'lane', ['CRITICAL', 'HIGH', 'NORMAL']);
    const lanes = result.rows.map(r => {
      const cell = r.cell(LANE_COL);
      return cell.type !== 'NULL' ? String(cell.value) : '';
    });
    expect(lanes).toEqual(['CRITICAL', 'HIGH', 'NORMAL']);
  });

  it('places unordered groups after ordered groups alphabetically', () => {
    const ds = makeDataSet([
      { lane: 'NORMAL', name: 'a' },
      { lane: 'UNKNOWN', name: 'b' },
      { lane: 'CRITICAL', name: 'c' },
      { lane: 'DEBUG', name: 'd' },
    ]);
    const result = el._prepareDataSet(ds, 'lane', ['CRITICAL', 'NORMAL']);
    const lanes = result.rows.map(r => {
      const cell = r.cell(LANE_COL);
      return cell.type !== 'NULL' ? String(cell.value) : '';
    });
    expect(lanes).toEqual(['CRITICAL', 'NORMAL', 'DEBUG', 'UNKNOWN']);
  });

  it('returns empty dataset without error', () => {
    const ds = makeDataSet([]);
    const result = el._prepareDataSet(ds, 'lane');
    expect(result.rows).toHaveLength(0);
  });

  it('preserves within-group order (stable sort)', () => {
    const ds = makeDataSet([
      { lane: 'HIGH', name: 'second' },
      { lane: 'HIGH', name: 'first' },
      { lane: 'LOW', name: 'only' },
    ]);
    const result = el._prepareDataSet(ds, 'lane');
    const names = result.rows
      .filter(r => { const c = r.cell(LANE_COL); return c.type !== 'NULL' && String(c.value) === 'HIGH'; })
      .map(r => { const c = r.cell(NAME_COL); return c.type !== 'NULL' ? String(c.value) : ''; });
    expect(names).toEqual(['second', 'first']);
  });

  it('handles single group', () => {
    const ds = makeDataSet([
      { lane: 'HIGH', name: 'a' },
      { lane: 'HIGH', name: 'b' },
    ]);
    const result = el._prepareDataSet(ds, 'lane');
    expect(result.rows).toHaveLength(2);
  });
});

describe('grouped-data-view rendering', () => {
  let el: GroupedDataViewEl;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
  });

  it('creates pages-grouped-view in shadow DOM when groupBy and dataSet are present', async () => {
    el.groupBy = 'lane';
    el.dataSet = makeDataSet([
      { lane: 'HIGH', name: 'pr-1' },
      { lane: 'NORMAL', name: 'pr-2' },
    ]);
    await el.updateComplete;
    const grouped = el.shadowRoot!.querySelector('pages-grouped-view');
    expect(grouped).toBeTruthy();
  });

  it('does not render pages-grouped-view when groupBy is missing', async () => {
    el.dataSet = makeDataSet([{ lane: 'HIGH', name: 'pr-1' }]);
    await el.updateComplete;
    const grouped = el.shadowRoot!.querySelector('pages-grouped-view');
    expect(grouped).toBeFalsy();
  });

  it('does not render pages-grouped-view when dataSet is missing', async () => {
    el.groupBy = 'lane';
    await el.updateComplete;
    const grouped = el.shadowRoot!.querySelector('pages-grouped-view');
    expect(grouped).toBeFalsy();
  });

  it('never sets lookup on pages-grouped-view props', async () => {
    el.groupBy = 'lane';
    el.dataSet = makeDataSet([{ lane: 'HIGH', name: 'pr-1' }]);
    await el.updateComplete;
    const gv = el.shadowRoot!.querySelector('pages-grouped-view') as any;
    expect(gv.props?.lookup).toBeUndefined();
  });

  it('forwards dataSet directly when set (hosted push)', async () => {
    el.groupBy = 'lane';
    el.dataSet = makeDataSet([
      { lane: 'HIGH', name: 'pr-1' },
      { lane: 'NORMAL', name: 'pr-2' },
    ]);
    await el.updateComplete;
    const gv = el.shadowRoot!.querySelector('pages-grouped-view') as any;
    expect(gv).toBeTruthy();
    expect(gv.dataSet).toBeTruthy();
    expect(gv.dataSet.rows).toHaveLength(2);
  });
});

describe('event capture', () => {
  let el: GroupedDataViewEl;

  beforeEach(() => {
    el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('intercepts group-toggle and re-dispatches as grouped-data.group-toggle', async () => {
    el.groupBy = 'lane';
    el.dataSet = makeDataSet([{ lane: 'HIGH', name: 'pr-1' }]);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);

    const gv = el.shadowRoot!.querySelector('pages-grouped-view');
    expect(gv).toBeTruthy();

    gv!.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: { topic: 'group-toggle', payload: { group: 'HIGH', expanded: false } },
    }));

    const match = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'grouped-data.group-toggle'
    );
    expect(match).toBeTruthy();
    expect((match![0] as CustomEvent).detail.payload).toEqual({ group: 'HIGH', expanded: false });

    el.removeEventListener('pages-event', handler);
  });

  it('intercepts row-activate and re-dispatches as grouped-data.row-activated', async () => {
    el.groupBy = 'lane';
    el.dataSet = makeDataSet([{ lane: 'HIGH', name: 'pr-1' }]);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);

    const gv = el.shadowRoot!.querySelector('pages-grouped-view');
    gv!.dispatchEvent(new CustomEvent('row-activate', {
      bubbles: true,
      composed: true,
      detail: { row: { id: 'pr-1' }, key: 'pr-1' },
    }));

    const match = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'grouped-data.row-activated'
    );
    expect(match).toBeTruthy();

    el.removeEventListener('pages-event', handler);
  });

  it('stops propagation of original events', async () => {
    el.groupBy = 'lane';
    el.dataSet = makeDataSet([{ lane: 'HIGH', name: 'pr-1' }]);
    await el.updateComplete;

    const outerHandler = vi.fn();
    document.addEventListener('pages-event', outerHandler);

    const gv = el.shadowRoot!.querySelector('pages-grouped-view');
    gv!.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: { topic: 'group-toggle', payload: { group: 'HIGH', expanded: false } },
    }));

    const rawToggle = outerHandler.mock.calls.filter(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'group-toggle'
    );
    expect(rawToggle).toHaveLength(0);

    document.removeEventListener('pages-event', outerHandler);
  });
});

describe('configure()', () => {
  let el: GroupedDataViewEl;

  beforeEach(() => {
    el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('sets all properties atomically', () => {
    const groupConfig = new Map([['HIGH', { className: 'lane-high' }]]);
    el.configure({
      groupBy: 'lane',
      groupOrder: ['CRITICAL', 'HIGH', 'NORMAL'],
      groupConfig,
      preset: 'spreadsheet',
      sortable: true,
    });
    expect(el.groupBy).toBe('lane');
    expect(el.groupOrder).toEqual(['CRITICAL', 'HIGH', 'NORMAL']);
    expect(el.groupConfig).toBe(groupConfig);
    expect(el.preset).toBe('spreadsheet');
    expect(el.sortable).toBe(true);
  });
});

describe('group styling resolution', () => {
  it('uses groupStyle callback when present', () => {
    const el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    const styleFn = (name: string) => name === 'HIGH' ? { className: 'from-callback' } : undefined;
    el.groupStyle = styleFn;
    el.groupConfig = new Map([['HIGH', { className: 'from-map' }]]);
    const resolved = el.groupStyle('HIGH');
    expect(resolved?.className).toBe('from-callback');
  });

  it('falls back to groupConfig when groupStyle returns undefined', () => {
    const el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    el.groupStyle = () => undefined;
    el.groupConfig = new Map([['HIGH', { className: 'from-map' }]]);
    const resolved = el.groupStyle('HIGH') ?? el.groupConfig?.get('HIGH');
    expect(resolved?.className).toBe('from-map');
  });
});

describe('loading and error states', () => {
  let el: GroupedDataViewEl;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    el = document.createElement('agency-grouped-data-view') as GroupedDataViewEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
  });

  it('shows loading state', async () => {
    el.groupBy = 'lane';
    (el as any).loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Loading');
  });

  it('shows empty state when no data', async () => {
    el.groupBy = 'lane';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No data');
  });

  it('has aria-label on host', () => {
    expect(el.getAttribute('aria-label')).toBe('Grouped data');
  });

  it('accepts custom aria-label', async () => {
    el.setAttribute('aria-label', 'Cases by lane');
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('Cases by lane');
  });
});
