import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphqlInvokeHandler } from './graphql-handler.js';
import type { GraphqlBinding } from '../types.js';

describe('GraphqlInvokeHandler', () => {
  const binding: GraphqlBinding = { kind: 'graphql', query: '{ users { id } }' };
  const definition = { name: 'query-users', inputs: {}, outputs: {} };

  afterEach(() => { vi.unstubAllGlobals(); });

  it('supports graphql binding', () => {
    const handler = new GraphqlInvokeHandler('http://gql');
    expect(handler.supports({ kind: 'graphql', query: '' })).toBe(true);
    expect(handler.supports({ kind: 'rest' as never, method: 'GET', url: '', headers: {}, body: {} })).toBe(false);
  });

  it('successful fetch returns stepSuccess', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ data: { users: [] } }) });
    vi.stubGlobal('fetch', mockFetch);
    const handler = new GraphqlInvokeHandler('http://gql/endpoint');
    const action = handler.create(definition, binding);
    const result = await action.execute({ limit: 10 }, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { data: { users: [] } }, executionMetadata: {} });
    expect(mockFetch).toHaveBeenCalledWith('http://gql/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ users { id } }', variables: { limit: 10 } }),
    });
  });

  it('fetch error returns stepFailure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const handler = new GraphqlInvokeHandler('http://gql');
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('network down');
  });
});
