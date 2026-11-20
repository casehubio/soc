import { describe, it, expect } from 'vitest';
import { DefaultScenarioScope } from '@casehubio/yaml-core/orchestration';
import { DefaultVirtualClock } from './virtual-clock.js';
import { evaluateTrigger } from './trigger-evaluator.js';
import type { DataTrigger, TimeTrigger } from './types.js';

describe('evaluateTrigger', () => {
  it('DataTrigger fires when channel has data', async () => {
    const scope = new DefaultScenarioScope();
    const clock = new DefaultVirtualClock();
    const ch = scope.channel<number>('trades');
    const trigger: DataTrigger = { type: 'data', channel: 'trades' };

    expect(evaluateTrigger(trigger, scope, clock)).toBe(false);
    await ch.send(42);
    expect(evaluateTrigger(trigger, scope, clock)).toBe(true);
  });

  it('DataTrigger does not fire on empty channel', () => {
    const scope = new DefaultScenarioScope();
    const clock = new DefaultVirtualClock();
    const trigger: DataTrigger = { type: 'data', channel: 'trades' };

    scope.channel('trades');
    expect(evaluateTrigger(trigger, scope, clock)).toBe(false);
  });

  it('TimeTrigger fires when virtual time passes fireTime', () => {
    const scope = new DefaultScenarioScope();
    const clock = new DefaultVirtualClock();
    const trigger: TimeTrigger = { type: 'time', delay: '5s', fireTime: 5000 };

    expect(evaluateTrigger(trigger, scope, clock)).toBe(false);
    clock.advance(4999);
    expect(evaluateTrigger(trigger, scope, clock)).toBe(false);
    clock.advance(1);
    expect(evaluateTrigger(trigger, scope, clock)).toBe(true);
  });

  it('TimeTrigger without fireTime never fires', () => {
    const scope = new DefaultScenarioScope();
    const clock = new DefaultVirtualClock();
    const trigger: TimeTrigger = { type: 'time', delay: '5s' };

    clock.advance(10000);
    expect(evaluateTrigger(trigger, scope, clock)).toBe(false);
  });
});
