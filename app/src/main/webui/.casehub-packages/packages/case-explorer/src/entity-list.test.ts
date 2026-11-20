import { describe, it, expect, vi, beforeEach } from 'vitest';
import './entity-list.js';
import type { EntityTypeRegistration, EntityListResponse, EntityInstance } from './types.js';
import { columnId } from '@casehubio/pages-data';

describe('EntityList', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = vi.fn();
    document.body.innerHTML = '';
  });

  const testEntity: EntityInstance = {
    id: 'c1',
    type: 'case-instance',
    status: 'RUNNING',
    summary: 'PR Review #42',
    state: {},
    availableCommands: [],
    createdAt: '2026-01-01T00:00:00Z',
  };

  const testResponse: EntityListResponse = {
    entities: [testEntity],
    totalCount: 1,
  };

  const paginatedResponse: EntityListResponse = {
    entities: [testEntity],
    nextCursor: 'cursor-page-2',
    totalCount: 5,
  };

  const testRegistration: EntityTypeRegistration = {
    type: 'case-instance',
    label: 'Cases',
    listEndpoint: '/api/cases',
    detailEndpoint: (id) => `/api/cases/${id}`,
    columnConfig: [
      { id: columnId('summary'), label: 'Name' },
      { id: columnId('status'), label: 'Status' },
    ],
  };

  function createList(reg: EntityTypeRegistration = testRegistration) {
    const el = document.createElement('agency-entity-list') as any;
    el.registration = reg;
    el.fetchFn = fetchFn;
    el.selectionTopic = 'case';
    document.body.appendChild(el);
    return el;
  }

  it('fetches from registration.listEndpoint on connectedCallback', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));

    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('/api/cases');
    expect(calledUrl).toContain('limit=25');
  });

  it('converts entities to TypedDataSet and passes to inner list-pane', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const listPane = el.shadowRoot!.querySelector('agency-list-pane');
    expect(listPane).toBeTruthy();
    expect(listPane!.dataSet).toBeTruthy();
    expect(listPane!.dataSet!.rows.length).toBe(1);
  });

  it('emits EntitySelection on row activation', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const events: CustomEvent[] = [];
    document.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail?.topic === 'case:selected') events.push(e);
    }) as EventListener);

    el._handleRowActivation({ id: 'c1', type: 'case-instance' });
    await new Promise(r => setTimeout(r, 0));

    expect(events.length).toBe(1);
    expect(events[0]!.detail.payload.id).toBe('c1');
    expect(events[0]!.detail.payload.type).toBe('case-instance');
  });

  it('renders load-more control when nextCursor is present', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => paginatedResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const loadMore = el.shadowRoot!.querySelector('.load-more');
    expect(loadMore).toBeTruthy();
  });

  it('load-more fetches next page and appends entities', async () => {
    const page2Entity: EntityInstance = { ...testEntity, id: 'c2', summary: 'PR Review #43' };
    const page2Response: EntityListResponse = { entities: [page2Entity], totalCount: 5 };

    fetchFn
      .mockResolvedValueOnce({ ok: true, json: async () => paginatedResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => page2Response });

    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const loadMore = el.shadowRoot!.querySelector('.load-more button') as HTMLButtonElement;
    loadMore.click();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]![0]).toContain('cursor=cursor-page-2');
    const listPane = el.shadowRoot!.querySelector('agency-list-pane');
    expect(listPane!.dataSet!.rows.length).toBe(2);
  });

  it('does not render load-more when no nextCursor', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const loadMore = el.shadowRoot!.querySelector('.load-more');
    expect(loadMore).toBeNull();
  });

  it('shows loading state during fetch', async () => {
    let resolve: (v: any) => void;
    const pending = new Promise(r => { resolve = r; });
    fetchFn.mockReturnValue(pending);

    const el = createList();
    await el.updateComplete;

    expect(el._loading).toBe(true);
    resolve!({ ok: true, json: async () => testResponse });
  });

  it('shows error state on fetch failure', async () => {
    fetchFn.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    expect(el._error).toBeTruthy();
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).toBeTruthy();
  });

  it('renders filter controls from registration.filters', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const regWithFilters: EntityTypeRegistration = {
      ...testRegistration,
      filters: [
        { field: 'status', label: 'Status', type: 'select', options: [{ value: 'RUNNING', label: 'Running' }, { value: 'COMPLETED', label: 'Completed' }] },
      ],
    };
    const el = createList(regWithFilters);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const filterBar = el.shadowRoot!.querySelector('.filter-bar');
    expect(filterBar).toBeTruthy();
    const select = filterBar!.querySelector('select');
    expect(select).toBeTruthy();
  });

  it('getRowKey returns unique keys per row (not all the same)', async () => {
    const multiResponse: EntityListResponse = {
      entities: [
        testEntity,
        { ...testEntity, id: 'c2', summary: 'PR Review #43' },
        { ...testEntity, id: 'c3', summary: 'PR Review #44' },
      ],
      totalCount: 3,
    };
    fetchFn.mockResolvedValue({ ok: true, json: async () => multiResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
    const rowKeyFn = listPane.getRowKey;
    expect(rowKeyFn).toBeTruthy();

    const rows = listPane.dataSet!.rows;
    const keys = rows.map((row: unknown) => rowKeyFn(row));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
    expect(keys[0]).toBe('c1');
    expect(keys[1]).toBe('c2');
    expect(keys[2]).toBe('c3');
  });

  it('_onRowActivate uses row key to identify entity, not index', async () => {
    const multiResponse: EntityListResponse = {
      entities: [
        testEntity,
        { ...testEntity, id: 'c2', summary: 'PR Review #43' },
        { ...testEntity, id: 'c3', summary: 'PR Review #44' },
      ],
      totalCount: 3,
    };
    fetchFn.mockResolvedValue({ ok: true, json: async () => multiResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const events: CustomEvent[] = [];
    document.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail?.topic === 'case:selected') events.push(e);
    }) as EventListener);

    const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
    const secondRow = listPane.dataSet!.rows[1];
    listPane.dispatchEvent(new CustomEvent('row-activate', {
      detail: { row: secondRow, key: 'c2' },
      bubbles: true,
      composed: true,
    }));
    await new Promise(r => setTimeout(r, 0));

    expect(events.length).toBe(1);
    expect(events[0]!.detail.payload.id).toBe('c2');
  });

  it('_onRowActivate uses row key to identify entity, not index', async () => {
    const multiResponse: EntityListResponse = {
      entities: [
        testEntity,
        { ...testEntity, id: 'c2', summary: 'PR Review #43' },
        { ...testEntity, id: 'c3', summary: 'PR Review #44' },
      ],
      totalCount: 3,
    };
    fetchFn.mockResolvedValue({ ok: true, json: async () => multiResponse });
    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const events: CustomEvent[] = [];
    document.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail?.topic === 'case:selected') events.push(e);
    }) as EventListener);

    const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
    const secondRow = listPane.dataSet!.rows[1];
    listPane.dispatchEvent(new CustomEvent('row-activate', {
      detail: { row: secondRow, key: 'c2' },
      bubbles: true,
      composed: true,
    }));
    await new Promise(r => setTimeout(r, 0));

    expect(events.length).toBe(1);
    expect(events[0]!.detail.payload.id).toBe('c2');
  });

  it('re-fetches when registration changes', async () => {
    const workerResponse: EntityListResponse = {
      entities: [{ ...testEntity, id: 'w1', type: 'worker', summary: 'Build Pipeline' }],
      totalCount: 1,
    };
    fetchFn
      .mockResolvedValueOnce({ ok: true, json: async () => testResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => workerResponse });

    const el = createList();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const firstUrl = fetchFn.mock.calls[0]![0] as string;
    expect(firstUrl).toContain('/api/cases');

    const workerReg: EntityTypeRegistration = {
      ...testRegistration,
      type: 'worker',
      label: 'Workers',
      listEndpoint: '/api/workers',
      detailEndpoint: (id) => `/api/workers/${id}`,
    };
    el.registration = workerReg;
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const secondUrl = fetchFn.mock.calls[1]![0] as string;
    expect(secondUrl).toContain('/api/workers');
  });
});
