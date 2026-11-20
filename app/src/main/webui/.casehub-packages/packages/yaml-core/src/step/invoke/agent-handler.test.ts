import { describe, it, expect, vi } from 'vitest';
import { AgentInvokeHandler } from './agent-handler.js';
import type { AgentBinding } from '../types.js';

describe('AgentInvokeHandler', () => {
  const binding: AgentBinding = { kind: 'agent', descriptor: 'summarizer', model: 'gpt-4', timeout: '30s', structuredOutput: true };
  const definition = { name: 'summarize', inputs: {}, outputs: {} };

  it('supports agent binding', () => {
    const handler = new AgentInvokeHandler(vi.fn());
    expect(handler.supports({ kind: 'agent', descriptor: 'x', structuredOutput: false })).toBe(true);
    expect(handler.supports({ kind: 'mcp' as never, tool: 'x' })).toBe(false);
  });

  it('successful invocation returns stepSuccess', async () => {
    const invoker = vi.fn().mockResolvedValue({ summary: 'done' });
    const handler = new AgentInvokeHandler(invoker);
    const action = handler.create(definition, binding);
    const result = await action.execute({ text: 'hello' }, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { summary: 'done' }, executionMetadata: {} });
    expect(invoker).toHaveBeenCalledWith('summarizer', { text: 'hello' }, { model: 'gpt-4', timeout: '30s', structuredOutput: true });
  });

  it('invoker error returns stepFailure', async () => {
    const invoker = vi.fn().mockRejectedValue(new Error('timeout'));
    const handler = new AgentInvokeHandler(invoker);
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('summarizer');
    expect((result as { message: string }).message).toContain('timeout');
  });
});
