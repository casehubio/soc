import { describe, it, expect, vi } from 'vitest';
import { McpToolSource, type McpToolInvoker } from './mcp-source.js';
import type { Definition } from '../types.js';
import type { CatalogEntry } from '../walker.js';
import type { MapServiceRegistry } from '../walker.js';

const definition: Definition = { name: 'myTool', inputs: {}, outputs: {} };

function makeSource(invoker = vi.fn<McpToolInvoker>(async () => ({ result: 'ok' }))) {
  const tools = new Map<string, Definition>([['myTool', definition]]);
  return { source: new McpToolSource(tools, invoker), invoker };
}

describe('McpToolSource', () => {
  it('priority is 300', () => {
    expect(makeSource().source.priority).toBe(300);
  });

  it('populate adds entries with correct qualifiedName and definition', () => {
    const { source } = makeSource();
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.size).toBe(1);
    expect(entries.get('myTool')!.qualifiedName).toBe('myTool');
    expect(entries.get('myTool')!.definition).toBe(definition);
  });

  it('populate does not overwrite existing entries', () => {
    const { source } = makeSource();
    const existing: CatalogEntry = { qualifiedName: 'myTool', definition, action: { execute: vi.fn() } };
    const entries = new Map<string, CatalogEntry>([['myTool', existing]]);
    source.populate(entries);
    expect(entries.get('myTool')).toBe(existing);
  });

  it('action execute — successful invocation returns stepSuccess', async () => {
    const invoker = vi.fn<McpToolInvoker>(async () => ({ value: 42 }));
    const { source } = makeSource(invoker);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    const result = await entries.get('myTool')!.action.execute({ x: 1 }, {} as MapServiceRegistry);
    expect(result.kind).toBe('success');
    expect((result as { kind: 'success'; output: Record<string, unknown> }).output).toEqual({ value: 42 });
    expect(invoker).toHaveBeenCalledWith('myTool', { x: 1 });
  });

  it('action execute — invoker throws returns stepFailure with tool name', async () => {
    const invoker = vi.fn(async () => { throw new Error('connection refused'); });
    const { source } = makeSource(invoker);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    const result = await entries.get('myTool')!.action.execute({}, {} as MapServiceRegistry);
    expect(result.kind).toBe('failure');
    expect((result as { kind: 'failure'; message: string }).message).toContain('myTool');
    expect((result as { kind: 'failure'; message: string }).message).toContain('connection refused');
  });
});
