import { describe, it, expect, vi } from 'vitest';
import { ScriptInvokeHandler } from './script-handler.js';
import type { ScriptBinding } from '../types.js';

describe('ScriptInvokeHandler', () => {
  const binding: ScriptBinding = { kind: 'script', runtime: 'python3', script: 'run.py', timeout: '10s', env: { KEY: 'val' } };
  const definition = { name: 'run-script', inputs: {}, outputs: {} };

  it('supports script binding', () => {
    const handler = new ScriptInvokeHandler(vi.fn());
    expect(handler.supports(binding)).toBe(true);
    expect(handler.supports({ kind: 'rest' as never, method: 'GET', url: '', headers: {}, body: {} })).toBe(false);
  });

  it('executor returns valid JSON → stepSuccess with parsed object', async () => {
    const executor = vi.fn().mockResolvedValue('{"result":42}');
    const handler = new ScriptInvokeHandler(executor);
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { result: 42 }, executionMetadata: {} });
  });

  it('executor returns non-JSON → stepSuccess with {output}', async () => {
    const executor = vi.fn().mockResolvedValue('plain text');
    const handler = new ScriptInvokeHandler(executor);
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { output: 'plain text' }, executionMetadata: {} });
  });

  it('params merged into env', async () => {
    const executor = vi.fn().mockResolvedValue('{}');
    const handler = new ScriptInvokeHandler(executor);
    const action = handler.create(definition, binding);
    await action.execute({ name: 'bob', items: [1, 2] }, undefined as never);
    const passedEnv = executor.mock.calls[0]![2] as Record<string, string>;
    expect(passedEnv['KEY']).toBe('val');
    expect(passedEnv['name']).toBe('bob');
    expect(passedEnv['items']).toBe('[1,2]');
  });

  it('executor throws → stepFailure', async () => {
    const executor = vi.fn().mockRejectedValue(new Error('script error'));
    const handler = new ScriptInvokeHandler(executor);
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('script error');
  });
});
