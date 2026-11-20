import { describe, it, expect } from 'vitest';
import { DefaultDeadlineContext, QuorumTracker, ScopeUtils } from './runner.js';

describe('DefaultDeadlineContext', () => {
  it('reports not expired when no deadline', () => {
    const ctx = new DefaultDeadlineContext();
    expect(ctx.isExpired()).toBe(false);
    expect(ctx.remaining()).toBeUndefined();
  });

  it('reports not expired within deadline', () => {
    const ctx = new DefaultDeadlineContext(10000);
    expect(ctx.isExpired()).toBe(false);
    expect(ctx.remaining()).toBeGreaterThan(0);
  });

  it('reports expired after deadline', async () => {
    const ctx = new DefaultDeadlineContext(10);
    await new Promise(r => setTimeout(r, 15));
    expect(ctx.isExpired()).toBe(true);
    expect(ctx.remaining()).toBe(0);
  });
});

describe('QuorumTracker', () => {
  it('tracks completed steps', () => {
    const tracker = new QuorumTracker();
    tracker.record('a');
    tracker.record('b');
    expect(tracker.completedCount(['a', 'b', 'c'])).toBe(2);
  });

  it('reports satisfaction when threshold met', () => {
    const tracker = new QuorumTracker();
    tracker.record('x');
    tracker.record('y');
    expect(tracker.isSatisfied(2, ['x', 'y', 'z'])).toBe(true);
    expect(tracker.isSatisfied(3, ['x', 'y', 'z'])).toBe(false);
  });
});

describe('ScopeUtils', () => {
  it('flattens step results into dot-path scope', () => {
    const scope = ScopeUtils.buildResultScope({
      'step-a': { count: 42, name: 'test' },
      'step-b': { status: 'ok' },
    });
    expect(scope['step-a.count']).toBe('42');
    expect(scope['step-a.name']).toBe('test');
    expect(scope['step-b.status']).toBe('ok');
  });
});
