import { describe, it, expect, vi } from 'vitest';
import { fetchSource } from './fetch-source.js';
import type { DataSink } from '../types.js';
import { columnId, ColumnType } from '../../dataset/types.js';
import type { TypedDataSet } from '../../dataset/types.js';

function createMockSink(): DataSink & { applyCalls: any[]; errorCalls: any[] } {
  const sink = {
    applyCalls: [] as any[],
    errorCalls: [] as any[],
    apply(event: any) { sink.applyCalls.push(event); },
    error(err: any) { sink.errorCalls.push(err); },
  };
  return sink;
}

function mockFetchOk(data: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  });
}

function mockFetchFail(status: number): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
  });
}

function mockFetchReject(message: string): typeof globalThis.fetch {
  return vi.fn().mockRejectedValue(new Error(message));
}

describe('fetchSource', () => {
  it('produces TypedDataSet with working accessors from JSON array', async () => {
    const source = fetchSource('http://api/items', {
      fetchFn: mockFetchOk([
        { name: 'Alice', score: 42 },
        { name: 'Bob', score: 88 },
      ]),
      columns: [
        { id: columnId('name'), type: ColumnType.TEXT },
        { id: columnId('score'), type: ColumnType.NUMBER },
      ],
    });

    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    const event = sink.applyCalls[0]!;
    expect(event.type).toBe('snapshot');
    const ds = event.dataset as TypedDataSet;
    expect(ds.columns).toHaveLength(2);
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0]!.text(columnId('name'))).toBe('Alice');
    expect(ds.rows[0]!.number(columnId('score'))).toBe(42);
  });

  it('infers columns from object array when not declared', async () => {
    const source = fetchSource('http://api/items', {
      fetchFn: mockFetchOk([{ city: 'London', pop: 9000000 }]),
    });

    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    const ds = sink.applyCalls[0]!.dataset as TypedDataSet;
    expect(ds.columns.length).toBeGreaterThan(0);
    expect(ds.rows).toHaveLength(1);
  });

  it('extracts totalRows via totalPath', async () => {
    const source = fetchSource('http://api/items', {
      fetchFn: mockFetchOk({
        items: [{ name: 'Alice' }],
        total: 100,
      }),
      columns: [{ id: columnId('name'), type: ColumnType.TEXT }],
      dataPath: 'items',
      totalPath: 'total',
    });

    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    expect(sink.applyCalls[0]!.totalRows).toBe(100);
    const ds = sink.applyCalls[0]!.dataset as TypedDataSet;
    expect(ds.rows).toHaveLength(1);
    expect(ds.rows[0]!.text(columnId('name'))).toBe('Alice');
  });

  it('extracts totalRows via nested totalPath', async () => {
    const source = fetchSource('http://api/items', {
      fetchFn: mockFetchOk({
        data: [{ x: 'y' }],
        meta: { totalCount: 42 },
      }),
      columns: [{ id: columnId('x'), type: ColumnType.TEXT }],
      dataPath: 'data',
      totalPath: 'meta.totalCount',
    });

    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    expect(sink.applyCalls[0]!.totalRows).toBe(42);
  });

  it('calls sink.error on HTTP failure', async () => {
    const source = fetchSource('http://api/items', { fetchFn: mockFetchFail(500) });
    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.errorCalls).toHaveLength(1); });

    expect(sink.errorCalls[0]!.message).toContain('500');
    expect(sink.errorCalls[0]!.permanent).toBe(true);
  });

  it('calls sink.error on network failure', async () => {
    const source = fetchSource('http://api/items', { fetchFn: mockFetchReject('network down') });
    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.errorCalls).toHaveLength(1); });

    expect(sink.errorCalls[0]!.message).toContain('network down');
  });

  it('does not call sink after disconnect (abort)', async () => {
    let resolvePromise!: (v: any) => void;
    const fetchFn = vi.fn().mockReturnValue(
      new Promise(r => { resolvePromise = r; })
    ) as unknown as typeof globalThis.fetch;

    const source = fetchSource('http://api/items', { fetchFn });
    const sink = createMockSink();
    source.connect(sink);
    source.disconnect();

    resolvePromise({ ok: true, headers: new Headers(), json: () => Promise.resolve([]) });
    await new Promise(r => setTimeout(r, 10));

    expect(sink.applyCalls).toHaveLength(0);
    expect(sink.errorCalls).toHaveLength(0);
  });

  it('passes static headers', async () => {
    const fetchFn = mockFetchOk([{ a: 1 }]);
    const source = fetchSource('http://api/items', {
      fetchFn,
      headers: { 'X-Custom': 'value' },
      columns: [{ id: columnId('a'), type: ColumnType.NUMBER }],
    });
    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    expect(fetchFn).toHaveBeenCalledWith('http://api/items', expect.objectContaining({
      headers: { 'X-Custom': 'value' },
    }));
  });

  it('uses custom method', async () => {
    const fetchFn = mockFetchOk([{ x: 1 }]);
    const source = fetchSource('http://api/items', {
      fetchFn,
      method: 'POST',
      columns: [{ id: columnId('x'), type: ColumnType.NUMBER }],
    });
    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    expect(fetchFn).toHaveBeenCalledWith('http://api/items', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('passes body', async () => {
    const fetchFn = mockFetchOk([{ x: 1 }]);
    const source = fetchSource('http://api/items', {
      fetchFn,
      body: '{"q":"x"}',
      columns: [{ id: columnId('x'), type: ColumnType.NUMBER }],
    });
    const sink = createMockSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(sink.applyCalls).toHaveLength(1); });

    expect(fetchFn).toHaveBeenCalledWith('http://api/items', expect.objectContaining({
      body: '{"q":"x"}',
    }));
  });
});
