import { describe, it, expect, vi } from 'vitest';
import { McpInvokeHandler } from './mcp-handler.js';
import type { McpBinding } from '../types.js';

describe('McpInvokeHandler', () => {
  const binding: McpBinding = { kind: 'mcp', tool: 'read-file' };
  const definition = { name: 'read', inputs: {}, outputs: {} };

  it('supports mcp binding', () => {
    const handler = new McpInvokeHandler(vi.fn());
    expect(handler.supports({ kind: 'mcp', tool: 'x' })).toBe(true);
    expect(handler.supports({ kind: 'agent' as never, descriptor: 'x', structuredOutput: false })).toBe(false);
  });

  it('successful invocation returns stepSuccess', async () => {
    const invoker = vi.fn().mockResolvedValue({ content: 'file data' });
    const handler = new McpInvokeHandler(invoker);
    const action = handler.create(definition, binding);
    const result = await action.execute({ path: '/tmp' }, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { content: 'file data' }, executionMetadata: {} });
    expect(invoker).toHaveBeenCalledWith('read-file', { path: '/tmp' });
  });

  it('invoker error returns stepFailure with tool name', async () => {
    const invoker = vi.fn().mockRejectedValue(new Error('not found'));
    const handler = new McpInvokeHandler(invoker);
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('read-file');
    expect((result as { message: string }).message).toContain('not found');
  });
});
