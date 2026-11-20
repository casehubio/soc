import { describe, it, expect, vi } from 'vitest';
import { WorkStencilRegistry, type FetchFn } from './registry.js';

const MARKETPLACE_A = `
name: marketplace-a
stencils:
  - name: send-email
    displayName: Send Email
    category: connectors/messaging
    icon: mail
    async: true
  - name: http-request
    displayName: HTTP Request
    category: connectors/http
    icon: globe
`;

const MARKETPLACE_B = `
name: marketplace-b
stencils:
  - name: llm-prompt
    displayName: LLM Prompt
    category: ai/agents
    icon: brain
`;

function createMockFetch(responses: Record<string, string>): FetchFn {
  return async (url: string): Promise<string> => {
    const content = responses[url];
    if (content === undefined) throw new Error(`Not found: ${url}`);
    return content;
  };
}

describe('WorkStencilRegistry', () => {
  it('loads stencils from multiple URLs', async () => {
    const registry = new WorkStencilRegistry({
      fetchFn: createMockFetch({
        'https://a.example.com/stencils.yaml': MARKETPLACE_A,
        'https://b.example.com/stencils.yaml': MARKETPLACE_B,
      }),
    });

    const result = await registry.load([
      'https://a.example.com/stencils.yaml',
      'https://b.example.com/stencils.yaml',
    ]);

    expect(result.loaded).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(registry.size).toBe(3);
  });

  it('retrieves stencil by name', async () => {
    const registry = new WorkStencilRegistry({
      fetchFn: createMockFetch({ 'https://a.example.com/s.yaml': MARKETPLACE_A }),
    });
    await registry.load(['https://a.example.com/s.yaml']);

    const email = registry.get('send-email');
    expect(email).toBeDefined();
    expect(email!.displayName).toBe('Send Email');
    expect(email!.async).toBe(true);

    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('lists all stencils', async () => {
    const registry = new WorkStencilRegistry({
      fetchFn: createMockFetch({ 'https://a.example.com/s.yaml': MARKETPLACE_A }),
    });
    await registry.load(['https://a.example.com/s.yaml']);

    const all = registry.list();
    expect(all).toHaveLength(2);
    expect(all.map(s => s.name)).toContain('send-email');
    expect(all.map(s => s.name)).toContain('http-request');
  });

  it('reports fetch errors without failing other URLs', async () => {
    const registry = new WorkStencilRegistry({
      fetchFn: createMockFetch({
        'https://good.example.com/s.yaml': MARKETPLACE_B,
      }),
    });

    const result = await registry.load([
      'https://good.example.com/s.yaml',
      'https://bad.example.com/s.yaml',
    ]);

    expect(result.loaded).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.url).toBe('https://bad.example.com/s.yaml');
  });

  it('replaces stencils on reload', async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      return MARKETPLACE_A;
    };

    const registry = new WorkStencilRegistry({ fetchFn });
    await registry.load(['https://a.example.com/s.yaml']);
    expect(registry.size).toBe(2);

    await registry.reload();
    expect(calls).toHaveLength(2);
    expect(registry.size).toBe(2);
  });

  it('skips refresh when cache is fresh', async () => {
    const fetchFn = vi.fn(async () => MARKETPLACE_A);
    const registry = new WorkStencilRegistry({ fetchFn, cacheTtlMs: 60_000 });

    await registry.load(['https://a.example.com/s.yaml']);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const result = await registry.refreshIfStale();
    expect(result).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clears all state', async () => {
    const registry = new WorkStencilRegistry({
      fetchFn: createMockFetch({ 'https://a.example.com/s.yaml': MARKETPLACE_A }),
    });
    await registry.load(['https://a.example.com/s.yaml']);

    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.list()).toHaveLength(0);
  });

  it('reports parse errors from malformed YAML', async () => {
    const registry = new WorkStencilRegistry({
      fetchFn: createMockFetch({ 'https://a.example.com/s.yaml': '{{invalid' }),
    });

    const result = await registry.load(['https://a.example.com/s.yaml']);
    expect(result.loaded).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});
