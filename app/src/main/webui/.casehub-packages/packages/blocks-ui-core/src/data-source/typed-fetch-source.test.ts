import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataSink } from '@casehubio/pages-data';
import { createTypedFetchSource } from './typed-fetch-source.js';

let originalFetch: typeof globalThis.fetch;

describe('createTypedFetchSource', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls handler with parsed JSON and sink on success', async () => {
    const data = { id: 1, name: 'test' };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    const handler = vi.fn();
    const source = createTypedFetchSource<typeof data>('http://test.local/api', handler);

    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(handler).toHaveBeenCalledWith(data, sink, expect.any(AbortSignal));
  });

  it('calls sink.error on HTTP failure', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));

    const handler = vi.fn();
    const source = createTypedFetchSource('http://test.local/api', handler);

    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    await vi.waitFor(() => expect(sink.error).toHaveBeenCalled());
    expect(handler).not.toHaveBeenCalled();
    expect(sink.error).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('500'),
      permanent: true,
    }));
  });

  it('calls sink.error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const handler = vi.fn();
    const source = createTypedFetchSource('http://test.local/api', handler);

    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    await vi.waitFor(() => expect(sink.error).toHaveBeenCalled());
    expect(sink.error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Network error',
      permanent: true,
    }));
  });

  it('aborts fetch on disconnect', async () => {
    let abortSignal: AbortSignal | null | undefined;
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      abortSignal = init?.signal;
      return new Promise(() => {});
    });

    const source = createTypedFetchSource('http://test.local/api', vi.fn());
    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    await vi.waitFor(() => expect(abortSignal).toBeDefined());
    source.disconnect();
    expect(abortSignal!.aborted).toBe(true);
  });

  it('does not call handler after disconnect', async () => {
    let resolveFetch!: (value: Response) => void;
    mockFetch.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const handler = vi.fn();
    const source = createTypedFetchSource('http://test.local/api', handler);
    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    source.disconnect();
    resolveFetch(new Response(JSON.stringify({}), { status: 200 }));

    await new Promise(r => setTimeout(r, 10));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call sink.error for AbortError after disconnect', async () => {
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    const source = createTypedFetchSource('http://test.local/api', vi.fn());
    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    source.disconnect();
    await new Promise(r => setTimeout(r, 10));
    expect(sink.error).not.toHaveBeenCalled();
  });

  it('passes custom method and headers to fetch', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const source = createTypedFetchSource('http://test.local/api', vi.fn(), {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
    });
    const sink: DataSink = { apply: vi.fn(), error: vi.fn() };
    source.connect(sink);

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [, init] = mockFetch.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual(expect.objectContaining({ 'X-Custom': 'value' }));
  });
});
