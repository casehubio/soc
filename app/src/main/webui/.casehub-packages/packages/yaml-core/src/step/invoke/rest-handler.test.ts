import { describe, it, expect, vi, afterEach } from 'vitest';
import { RestInvokeHandler } from './rest-handler.js';
import type { RestBinding } from '../types.js';

describe('RestInvokeHandler', () => {
  const postBinding: RestBinding = { kind: 'rest', method: 'POST', url: 'http://api/data', headers: { Authorization: 'Bearer tok' }, body: { source: 'test' } };
  const definition = { name: 'call-api', inputs: {}, outputs: {} };

  afterEach(() => { vi.unstubAllGlobals(); });

  it('supports rest binding', () => {
    const handler = new RestInvokeHandler();
    expect(handler.supports(postBinding)).toBe(true);
    expect(handler.supports({ kind: 'mcp' as never, tool: 'x' })).toBe(false);
  });

  it('successful POST merges headers and body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ id: 1 }) });
    vi.stubGlobal('fetch', mockFetch);
    const handler = new RestInvokeHandler();
    const action = handler.create(definition, postBinding);
    const result = await action.execute({ extra: 'param' }, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { id: 1 }, executionMetadata: {} });
    expect(mockFetch).toHaveBeenCalledWith('http://api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ source: 'test', extra: 'param' }),
    });
  });

  it('GET request sends null body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal('fetch', mockFetch);
    const handler = new RestInvokeHandler();
    const getBinding: RestBinding = { kind: 'rest', method: 'GET', url: 'http://api/list', headers: {}, body: {} };
    const action = handler.create(definition, getBinding);
    await action.execute({}, undefined as never);
    expect(mockFetch.mock.calls[0]![1].body).toBeNull();
  });

  it('fetch throws → stepFailure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    const handler = new RestInvokeHandler();
    const action = handler.create(definition, postBinding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('connection refused');
  });
});
