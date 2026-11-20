import { describe, it, expect, vi } from 'vitest';
import { AriaExecutor } from './step-executor.js';

describe('AriaExecutor', () => {
  it('canExecute returns true for aria delivery', () => {
    const exec = new AriaExecutor(vi.fn());
    expect(exec.canExecute({ delivery: 'aria', action: 'click' } as any)).toBe(true);
  });

  it('canExecute returns false for non-aria delivery', () => {
    const exec = new AriaExecutor(vi.fn());
    expect(exec.canExecute({ delivery: 'graphql' } as any)).toBe(false);
    expect(exec.canExecute({ delivery: 'orchestration' } as any)).toBe(false);
  });

  it('canExecute returns false when delivery missing', () => {
    const exec = new AriaExecutor(vi.fn());
    expect(exec.canExecute({} as any)).toBe(false);
  });

  it('execute delegates to command executor', async () => {
    const commandFn = vi.fn().mockResolvedValue(undefined);
    const exec = new AriaExecutor(commandFn);
    const step = { delivery: 'aria' as const, action: 'click', target: { role: 'button', name: 'OK' } };
    const ctx = { speed: 1, eventTarget: new EventTarget() } as any;
    await exec.execute(step, ctx);
    expect(commandFn).toHaveBeenCalledWith(step, ctx.eventTarget, ctx.speed);
  });
});
