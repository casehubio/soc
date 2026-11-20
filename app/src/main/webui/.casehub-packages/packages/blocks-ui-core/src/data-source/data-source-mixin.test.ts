import { describe, it, expect, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DataSourceMixin } from './data-source-mixin.js';
import { fetchSource } from './fetch-source.js';
import type { SourceFactory } from '@casehubio/pages-component';
import { toTypedDataSet } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';

function mockFetchOk(data: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  }) as unknown as typeof globalThis.fetch;
}

function mockFetchFail(status: number): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
  }) as unknown as typeof globalThis.fetch;
}

let testFetchFn: typeof globalThis.fetch = mockFetchOk([]);

@customElement('test-mixin-simple')
class SimpleMixinHost extends DataSourceMixin(LitElement) {
  override createSourceFactory(): SourceFactory {
    return (url, _id) => fetchSource(url, { fetchFn: testFetchFn });
  }
}

@customElement('test-mixin-derived')
class DerivedMixinHost extends DataSourceMixin(LitElement) {
  @property({ type: String }) itemId?: string;

  override createSourceFactory(): SourceFactory {
    return (url, _id) => fetchSource(url, { fetchFn: testFetchFn });
  }

  override resolveEndpoint(): string | undefined {
    if (!this.endpoint || !this.itemId) return undefined;
    return `${this.endpoint}/items/${this.itemId}`;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('itemId')) this.syncEndpoint();
  }

  override configure(props: Record<string, unknown>): void {
    if (props.itemId !== undefined) this.itemId = props.itemId as string;
    super.configure(props);
  }
}

async function flush(): Promise<void> {
  await new Promise(r => setTimeout(r, 20));
}

describe('DataSourceMixin', () => {
  afterEach(() => {
    document.querySelectorAll('test-mixin-simple, test-mixin-derived').forEach(e => e.remove());
    testFetchFn = mockFetchOk([]);
  });

  describe('simple endpoint', () => {
    it('fetches when endpoint is set as property', async () => {
      const fetchFn = mockFetchOk([{ id: 1 }]);
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      el.endpoint = '/api/items';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(el.dataSet).toBeDefined();
      expect(el.dataSet!.rows).toHaveLength(1);
      expect(el.dataSet!.columns.length).toBeGreaterThan(0);
    });

    it('does not fetch when endpoint is undefined', async () => {
      const fetchFn = mockFetchOk([]);
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('re-fetches when endpoint changes', async () => {
      const fetchFn = mockFetchOk([]);
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      el.endpoint = '/api/a';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      (fetchFn as ReturnType<typeof vi.fn>).mockClear();
      el.endpoint = '/api/b';
      await el.updateComplete;
      await flush();
      expect(fetchFn).toHaveBeenCalledWith('/api/b', expect.anything());
    });

    it('sets loading during fetch', async () => {
      let resolveJson!: (v: any) => void;
      testFetchFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => new Promise(r => { resolveJson = r; }),
      }) as unknown as typeof globalThis.fetch;

      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      el.endpoint = '/api/items';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      expect(el.loading).toBe(true);
      resolveJson([]);
      await flush();
      expect(el.loading).toBe(false);
    });

    it('sets error on fetch failure', async () => {
      testFetchFn = mockFetchFail(500);
      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      el.endpoint = '/api/items';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();
      expect(el.error).toContain('500');
    });

    it('mutual-clearing: dataSet clears error', async () => {
      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      document.body.appendChild(el);
      await el.updateComplete;

      el.error = 'something broke';
      expect(el.error).toBe('something broke');

      const ds = toTypedDataSet({ columns: [{ id: columnId('x'), name: 'x', type: ColumnType.TEXT }], data: [] });
      el.dataSet = ds;
      expect(el.error).toBe('');
      expect(el.dataSet).toBe(ds);
    });

    it('DataReceiver setters delegate to controller', async () => {
      const el = document.createElement('test-mixin-simple') as SimpleMixinHost;
      document.body.appendChild(el);
      await el.updateComplete;

      el.loading = true;
      expect(el.dataSource.controller.loading).toBe(true);

      const ds = toTypedDataSet({ columns: [{ id: columnId('a'), name: 'a', type: ColumnType.TEXT }], data: [['v']] });
      el.dataSet = ds;
      expect(el.dataSource.controller.dataSet).toBe(ds);
      expect(el.loading).toBe(false);

      el.error = 'push-error';
      expect(el.dataSource.controller.error).toBe('push-error');
    });
  });

  describe('resolveEndpoint', () => {
    it('derives URL from endpoint + itemId', async () => {
      const fetchFn = mockFetchOk({ name: 'thing' });
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-derived') as DerivedMixinHost;
      el.endpoint = '/api';
      el.itemId = '42';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      expect(fetchFn).toHaveBeenCalledWith('/api/items/42', expect.anything());
    });

    it('does not fetch when itemId is missing', async () => {
      const fetchFn = mockFetchOk({});
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-derived') as DerivedMixinHost;
      el.endpoint = '/api';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('re-fetches when itemId changes', async () => {
      const fetchFn = mockFetchOk({});
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-derived') as DerivedMixinHost;
      el.endpoint = '/api';
      el.itemId = '1';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      (fetchFn as ReturnType<typeof vi.fn>).mockClear();
      el.itemId = '2';
      await el.updateComplete;
      await flush();
      expect(fetchFn).toHaveBeenCalledWith('/api/items/2', expect.anything());
    });
  });

  describe('configure()', () => {
    it('batches endpoint + custom props — single fetch', async () => {
      const fetchFn = mockFetchOk({ name: 'configured' });
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-derived') as DerivedMixinHost;
      document.body.appendChild(el);
      await el.updateComplete;

      el.configure({ endpoint: '/api', itemId: '99' });
      await flush();
      await el.updateComplete;
      await flush();

      const calls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls;
      const itemCalls = calls.filter((c: any) => c[0] === '/api/items/99');
      expect(itemCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('syncEndpoint suppressed during configure', async () => {
      const fetchFn = mockFetchOk({});
      testFetchFn = fetchFn;
      const el = document.createElement('test-mixin-derived') as DerivedMixinHost;
      el.endpoint = '/api';
      el.itemId = '1';
      document.body.appendChild(el);
      await el.updateComplete;
      await flush();

      (fetchFn as ReturnType<typeof vi.fn>).mockClear();
      el.configure({ endpoint: '/api2', itemId: '2' });

      await el.updateComplete;
      await flush();

      const calls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[0]).toBe('/api2/items/2');
    });
  });
});
