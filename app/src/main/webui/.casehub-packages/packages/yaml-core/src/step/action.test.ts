import { describe, it, expect, vi } from 'vitest';
import { ValidatingAction } from './action.js';
import type { Definition } from './types.js';
import type { Action, ServiceRegistry } from './walker.js';
import { stepSuccess, stepFailure } from './walker.js';

const services: ServiceRegistry = { lookup: () => { throw new Error('unused'); } };

function def(overrides?: Partial<Definition>): Definition {
  return { name: 'test-action', inputs: {}, outputs: {}, ...overrides };
}

describe('ValidatingAction', () => {
  it('passes valid inputs to delegate and returns result', async () => {
    const expected = stepSuccess({ message: 'ok' });
    const delegate: Action = { execute: vi.fn().mockResolvedValue(expected) };
    const action = new ValidatingAction(delegate, def({
      inputs: { name: { type: 'STRING', required: true } },
    }));
    const result = await action.execute({ name: 'hello' }, services);
    expect(result).toBe(expected);
    expect(delegate.execute).toHaveBeenCalledWith({ name: 'hello' }, services);
  });

  it('returns failure when required input missing', async () => {
    const delegate: Action = { execute: vi.fn() };
    const action = new ValidatingAction(delegate, def({
      inputs: { name: { type: 'STRING', required: true } },
    }));
    const result = await action.execute({}, services);
    expect(result.kind).toBe('failure');
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('returns failure when input has wrong type', async () => {
    const delegate: Action = { execute: vi.fn() };
    const action = new ValidatingAction(delegate, def({
      inputs: { count: { type: 'INTEGER', required: true } },
    }));
    const result = await action.execute({ count: 'not-a-number' }, services);
    expect(result.kind).toBe('failure');
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('validates outputs on success — returns failure when output violates', async () => {
    const delegate: Action = { execute: vi.fn().mockResolvedValue(stepSuccess({ result: 42 })) };
    const action = new ValidatingAction(delegate, def({
      outputs: { result: { type: 'STRING', required: true } },
    }));
    const result = await action.execute({}, services);
    expect(result.kind).toBe('failure');
  });

  it('skips output validation when definition has no outputs', async () => {
    const expected = stepSuccess({ anything: 123 });
    const delegate: Action = { execute: vi.fn().mockResolvedValue(expected) };
    const action = new ValidatingAction(delegate, def());
    const result = await action.execute({}, services);
    expect(result).toBe(expected);
  });

  it('passes through delegate failure without output validation', async () => {
    const expected = stepFailure('boom');
    const delegate: Action = { execute: vi.fn().mockResolvedValue(expected) };
    const action = new ValidatingAction(delegate, def({
      outputs: { result: { type: 'STRING', required: true } },
    }));
    const result = await action.execute({}, services);
    expect(result).toBe(expected);
  });
});
