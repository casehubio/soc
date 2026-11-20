import { describe, it, expect, vi } from 'vitest';
import { ProcessInvokeHandler } from './process-handler.js';
import type { ProcessBinding } from '../types.js';

describe('ProcessInvokeHandler', () => {
  const baseBinding: ProcessBinding = { kind: 'process', command: 'echo', args: ['hello'], output: 'json', env: { BASE: '1' }, onError: 'stderr' };
  const definition = { name: 'run-echo', inputs: {}, outputs: {} };

  it('supports process binding', () => {
    const handler = new ProcessInvokeHandler(vi.fn());
    expect(handler.supports(baseBinding)).toBe(true);
    expect(handler.supports({ kind: 'mcp' as never, tool: 'x' })).toBe(false);
  });

  it('exit 0, json output, valid JSON stdout → parsed stepSuccess', async () => {
    const executor = vi.fn().mockResolvedValue({ stdout: '{"key":"val"}', stderr: '', exitCode: 0 });
    const handler = new ProcessInvokeHandler(executor);
    const action = handler.create(definition, baseBinding);
    const result = await action.execute({}, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { key: 'val' }, executionMetadata: {} });
  });

  it('exit 0, json output, invalid JSON stdout → stepSuccess with raw stdout', async () => {
    const executor = vi.fn().mockResolvedValue({ stdout: 'not json', stderr: '', exitCode: 0 });
    const handler = new ProcessInvokeHandler(executor);
    const action = handler.create(definition, baseBinding);
    const result = await action.execute({}, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { stdout: 'not json' }, executionMetadata: {} });
  });

  it('exit 0, text output → stepSuccess with stdout and stderr', async () => {
    const executor = vi.fn().mockResolvedValue({ stdout: 'hello', stderr: 'warn', exitCode: 0 });
    const handler = new ProcessInvokeHandler(executor);
    const binding = { ...baseBinding, output: 'text' };
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result).toEqual({ kind: 'success', output: { stdout: 'hello', stderr: 'warn' }, executionMetadata: {} });
  });

  it('non-zero exit, onError=stderr → stepFailure with stderr', async () => {
    const executor = vi.fn().mockResolvedValue({ stdout: 'out', stderr: 'bad stuff', exitCode: 1 });
    const handler = new ProcessInvokeHandler(executor);
    const action = handler.create(definition, baseBinding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('bad stuff');
  });

  it('non-zero exit, onError=stdout → stepFailure with stdout', async () => {
    const executor = vi.fn().mockResolvedValue({ stdout: 'error details', stderr: '', exitCode: 1 });
    const handler = new ProcessInvokeHandler(executor);
    const binding = { ...baseBinding, onError: 'stdout' };
    const action = handler.create(definition, binding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('error details');
  });

  it('params merged into env — strings as-is, non-strings JSON.stringified', async () => {
    const executor = vi.fn().mockResolvedValue({ stdout: '{}', stderr: '', exitCode: 0 });
    const handler = new ProcessInvokeHandler(executor);
    const action = handler.create(definition, baseBinding);
    await action.execute({ name: 'alice', count: 5 }, undefined as never);
    const passedEnv = executor.mock.calls[0]![2] as Record<string, string>;
    expect(passedEnv['BASE']).toBe('1');
    expect(passedEnv['name']).toBe('alice');
    expect(passedEnv['count']).toBe('5');
  });

  it('executor throws → stepFailure', async () => {
    const executor = vi.fn().mockRejectedValue(new Error('spawn failed'));
    const handler = new ProcessInvokeHandler(executor);
    const action = handler.create(definition, baseBinding);
    const result = await action.execute({}, undefined as never);
    expect(result.kind).toBe('failure');
    expect((result as { message: string }).message).toContain('spawn failed');
  });
});
