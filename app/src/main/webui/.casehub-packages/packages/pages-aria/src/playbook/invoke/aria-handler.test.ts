import { describe, it, expect } from 'vitest';
import { AriaInvokeHandler } from './aria-handler.js';
import type { AriaBinding, Definition } from '@casehubio/yaml-core/step';
import { MapServiceRegistry } from '@casehubio/yaml-core/step';

describe('AriaInvokeHandler', () => {
  const handler = new AriaInvokeHandler();

  it('supports aria bindings', () => {
    expect(handler.supports({ kind: 'aria', action: 'click' })).toBe(true);
  });

  it('does not support non-aria bindings', () => {
    expect(handler.supports({ kind: 'mcp', tool: 'x' })).toBe(false);
    expect(handler.supports({ kind: 'rest', method: 'GET', url: '/', headers: {}, body: {} })).toBe(false);
  });

  it('creates action from aria binding', () => {
    const def: Definition = { name: 'click', inputs: {}, outputs: {} };
    const binding: AriaBinding = { kind: 'aria', action: 'click' };
    const action = handler.create(def, binding);
    expect(action).toBeDefined();
    expect(typeof action.execute).toBe('function');
  });

  it('action returns failure when command-executor is unavailable', async () => {
    const def: Definition = { name: 'click', inputs: {}, outputs: {} };
    const binding: AriaBinding = { kind: 'aria', action: 'click' };
    const action = handler.create(def, binding);

    const services = new MapServiceRegistry()
      .register({ name: 'EventTarget' }, new EventTarget())
      .register({ name: 'Speed' }, 1);

    const result = await action.execute({ role: 'button', name: 'A' }, services);
    // In test env, executeStep may fail (no DOM) — should get failure Result, not throw
    expect(result.kind).toBe('failure');
  });
});
