import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { TableColumnConfig } from '@casehubio/pages-table';
import type { TypedDataSet, TypedRow } from '@casehubio/pages-data';
import { columnId, ColumnType } from '@casehubio/pages-data';
import './list-pane.js';

type ListPaneEl = HTMLElement & {
  endpoint: string;
  columnConfig?: readonly TableColumnConfig[];
  getRowKey: (row: TypedRow) => string;
  getRowClass: (row: TypedRow) => string;
  selectionTopic: string;
  emptyMessage: string;
  pageSize: number;
  loading: boolean;
  error: string;
  dataSet: TypedDataSet | undefined;
  pushUrl: string;
  pushTopics: string[];
  refresh(): void;
  updateComplete: Promise<boolean>;
};

const testData = [
  { id: '1', name: 'Case A', status: 'open' },
  { id: '2', name: 'Case B', status: 'closed' },
];

function mockFetch(data: unknown = testData): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  });
}

function mockFetchFail(status: number): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
  });
}

let originalFetch: typeof globalThis.fetch;

function createElement(opts: Partial<{ endpoint: string; topic: string }> = {}): ListPaneEl {
  const el = document.createElement('agency-list-pane') as ListPaneEl;
  if (opts.endpoint !== undefined) el.endpoint = opts.endpoint;
  else el.endpoint = '/api/items';
  el.selectionTopic = opts.topic ?? 'test';
  el.columnConfig = [
    { id: columnId('name'), sortable: true },
    { id: columnId('status'), sortable: true },
  ];
  el.getRowKey = (row: TypedRow) => {
    const cell = row.cell(columnId('id'));
    return cell.type === 'NULL' ? '' : String((cell as { value: unknown }).value);
  };
  return el;
}

async function flush(): Promise<void> {
  await new Promise(r => setTimeout(r, 20));
}

describe('agency-list-pane', () => {
  let el: ListPaneEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch() as unknown as typeof fetch;
  });

  afterEach(async () => {
    await new Promise(r => setTimeout(r, 200));
    el?.remove();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('data fetching', () => {
    it('fetches from endpoint on connect', async () => {
      const fetchFn = mockFetch();
      globalThis.fetch = fetchFn as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(fetchFn).toHaveBeenCalledWith('/api/items', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('passes TypedDataSet to pages-table', async () => {
      globalThis.fetch = mockFetch(testData) as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector('pages-table') as any;
      expect(table?.dataSet).toBeDefined();
      expect(table?.dataSet?.rows?.length).toBe(2);
    });

    it('does not fetch when endpoint is not set', async () => {
      const fetchFn = mockFetch();
      globalThis.fetch = fetchFn as unknown as typeof fetch;
      el = document.createElement('agency-list-pane') as ListPaneEl;
      el.getRowKey = (row: TypedRow) => {
        const cell = row.cell(columnId('id'));
        return cell.type === 'NULL' ? '' : String((cell as { value: unknown }).value);
      };
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('shows empty message when no data', async () => {
      el = document.createElement('agency-list-pane') as ListPaneEl;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('No items found');
    });

    it('shows custom empty message', async () => {
      el = document.createElement('agency-list-pane') as ListPaneEl;
      el.emptyMessage = 'Nothing here';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Nothing here');
    });

    it('sets error on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(el.error).toContain('network down');
    });

    it('sets error on non-ok response', async () => {
      globalThis.fetch = mockFetchFail(500) as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(el.error).toContain('500');
    });
  });

  describe('selection events', () => {
    it('emits topic:selected on row activation', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      const events: any[] = [];
      document.addEventListener('pages-event', ((e: CustomEvent) => {
        if (e.detail?.topic === 'test:selected') events.push(e.detail);
      }) as EventListener);

      const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
      const mockRow = { fake: true };
      table.dispatchEvent(new CustomEvent('row-activate', {
        bubbles: true,
        detail: { row: mockRow, index: 0 },
      }));

      expect(events.length).toBe(1);
      expect(events[0].payload).toBe(mockRow);
    });

    it('does not emit when no selection-topic is set', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      el.selectionTopic = '';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      const events: any[] = [];
      document.addEventListener('pages-event', ((e: CustomEvent) => {
        events.push(e.detail);
      }) as EventListener);

      const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
      table?.dispatchEvent(new CustomEvent('row-activate', {
        bubbles: true,
        detail: { row: { fake: true }, index: 0 },
      }));

      expect(events.length).toBe(0);
    });
  });

  describe('refresh', () => {
    it('refresh() re-fetches data', async () => {
      const fetchFn = mockFetch();
      globalThis.fetch = fetchFn as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      fetchFn.mockClear();
      el.refresh();
      await flush();
      expect(fetchFn).toHaveBeenCalled();
    });

    it('responds to topic:refresh event', async () => {
      const fetchFn = mockFetch();
      globalThis.fetch = fetchFn as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      fetchFn.mockClear();
      emitPagesEvent(document, 'test:refresh', {});
      await flush();
      expect(fetchFn).toHaveBeenCalled();
    });
  });

  describe('table configuration', () => {
    it('configures data-table with selection=single and mode=paginated', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      const table = el.shadowRoot!.querySelector('pages-table') as any;
      expect(table?.getAttribute('selection')).toBe('single');
      expect(table?.getAttribute('mode')).toBe('paginated');
    });

    it('enables client-sort and client-filter on data-table', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      const table = el.shadowRoot!.querySelector('pages-table') as any;
      expect(table?.hasAttribute('client-sort')).toBe(true);
      expect(table?.hasAttribute('client-filter')).toBe(true);
    });

    it('passes page-size to data-table', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      el.pageSize = 10;
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      const table = el.shadowRoot!.querySelector('pages-table') as any;
      expect(table?.pageSize).toBe(10);
    });

    it('passes columnConfig and getRowKey to pages-table', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      const table = el.shadowRoot!.querySelector('pages-table') as any;
      expect(table?.columnConfig).toBe(el.columnConfig);
      expect(table?.getRowKey).toBe(el.getRowKey);
    });
  });

  describe('accessibility', () => {
    it('host has tabindex -1 for programmatic focus', async () => {
      globalThis.fetch = mockFetch() as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('empty state has role=status', async () => {
      el = document.createElement('agency-list-pane') as ListPaneEl;
      document.body.appendChild(el);
      await el.updateComplete;
      const status = el.shadowRoot!.querySelector('[role="status"]');
      expect(status).toBeTruthy();
    });
  });

  describe('re-fetch on endpoint change', () => {
    it('re-fetches when endpoint property changes', async () => {
      const fetchFn = mockFetch();
      globalThis.fetch = fetchFn as unknown as typeof fetch;
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      fetchFn.mockClear();
      el.endpoint = '/api/other';
      await el.updateComplete;
      await flush();
      expect(fetchFn).toHaveBeenCalledWith('/api/other', expect.anything());
    });
  });

  describe('push support', () => {
    it('has pushUrl and pushTopics properties defaulting to empty', async () => {
      el = document.createElement('agency-list-pane') as unknown as ListPaneEl;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.pushUrl).toBe('');
      expect(el.pushTopics).toEqual([]);
    });

    it('does not create EventStreamController when pushUrl is empty', async () => {
      el = document.createElement('agency-list-pane') as unknown as ListPaneEl;
      el.pushTopics = ['items:*'];
      document.body.appendChild(el);
      await el.updateComplete;
      expect((el as any)._pushStream).toBeNull();
    });

    it('does not create EventStreamController when pushTopics is empty', async () => {
      el = document.createElement('agency-list-pane') as unknown as ListPaneEl;
      el.pushUrl = 'ws://localhost/api/push';
      document.body.appendChild(el);
      await el.updateComplete;
      expect((el as any)._pushStream).toBeNull();
    });
  });
});
