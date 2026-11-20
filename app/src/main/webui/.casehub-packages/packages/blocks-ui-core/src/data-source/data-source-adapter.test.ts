import { describe, it, expect, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { DataSourceAdapter } from './data-source-adapter.js';
import { fetchSource } from './fetch-source.js';
import type { TypedDataSet } from '@casehubio/pages-data/dist/dataset/types.js';

function mockFetchOk(data: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  }) as unknown as typeof globalThis.fetch;
}

@customElement('test-adapter-host')
class TestHost extends LitElement {
  _mockFetch: typeof globalThis.fetch = mockFetchOk([]);

  readonly dataSource = new DataSourceAdapter(this, {
    sourceFactory: (url, _id) => fetchSource(url, {
      fetchFn: this._mockFetch,
    }),
  });
}

@customElement('test-dual-adapter')
class DualHost extends LitElement {
  readonly primary = new DataSourceAdapter(this);
  readonly secondary = new DataSourceAdapter(this);
}

async function flush(): Promise<void> {
  await new Promise(r => setTimeout(r, 20));
}

describe('DataSourceAdapter', () => {
  afterEach(() => {
    document.querySelectorAll('test-adapter-host, test-dual-adapter').forEach(e => e.remove());
  });

  it('connects controller on hostConnected', async () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    el._mockFetch = mockFetchOk([{ id: 1 }]);
    document.body.appendChild(el);
    await el.updateComplete;

    el.dataSource.endpoint = '/api/items';
    await flush();
    expect(el.dataSource.dataSet).toBeDefined();
    expect(el.dataSource.dataSet!.rows).toHaveLength(1);
  });

  it('disconnects on removal from DOM', async () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    el._mockFetch = mockFetchOk([]);
    document.body.appendChild(el);
    await el.updateComplete;

    el.dataSource.endpoint = '/api/items';
    el.remove();
    await flush();
  });

  it('triggers host requestUpdate on data arrival', async () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    el._mockFetch = mockFetchOk([{ id: 1 }]);
    document.body.appendChild(el);
    await el.updateComplete;

    const spy = vi.spyOn(el, 'requestUpdate');
    el.dataSource.endpoint = '/api/items';
    await flush();
    expect(spy).toHaveBeenCalled();
  });

  it('proxies loading/error/dataSet to controller with mutual-clearing', async () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    document.body.appendChild(el);
    await el.updateComplete;

    el.dataSource.loading = true;
    expect(el.dataSource.loading).toBe(true);
    expect(el.dataSource.controller.loading).toBe(true);

    el.dataSource.error = 'fail';
    expect(el.dataSource.error).toBe('fail');
    expect(el.dataSource.loading).toBe(false);

    const emptyDataSet: TypedDataSet = { columns: [], rows: [] };
    el.dataSource.dataSet = emptyDataSet;
    expect(el.dataSource.dataSet).toEqual(emptyDataSet);
    expect(el.dataSource.error).toBe('');
  });

  it('refresh disconnects and reconnects source', async () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    const fetchFn = mockFetchOk([]);
    el._mockFetch = fetchFn;
    document.body.appendChild(el);
    await el.updateComplete;

    el.dataSource.endpoint = '/api/items';
    await flush();

    (fetchFn as ReturnType<typeof vi.fn>).mockClear();
    el.dataSource.refresh();
    await flush();
    expect(fetchFn).toHaveBeenCalled();
  });

  it('multiple adapters on one host both get lifecycle', async () => {
    const dual = document.createElement('test-dual-adapter') as DualHost;
    document.body.appendChild(dual);
    await dual.updateComplete;

    const primaryData: TypedDataSet = { columns: [], rows: [] };
    const secondaryData: TypedDataSet = { columns: [], rows: [] };
    dual.primary.dataSet = primaryData;
    dual.secondary.dataSet = secondaryData;
    expect(dual.primary.dataSet).toEqual(primaryData);
    expect(dual.secondary.dataSet).toEqual(secondaryData);

    dual.remove();
  });

  it('exposes controller for escape hatch', () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    expect(el.dataSource.controller).toBeDefined();
    expect(el.dataSource.controller.constructor.name).toBe('DataSourceController');
  });

  it('dispose clears source and endpoint', async () => {
    const el = document.createElement('test-adapter-host') as TestHost;
    el._mockFetch = mockFetchOk([]);
    document.body.appendChild(el);
    await el.updateComplete;

    el.dataSource.endpoint = '/api/items';
    await flush();

    el.dataSource.dispose();
    expect(el.dataSource.endpoint).toBeUndefined();
    expect(el.dataSource.source).toBeUndefined();
  });
});
