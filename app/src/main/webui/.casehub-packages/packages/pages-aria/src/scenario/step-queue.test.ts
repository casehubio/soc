import { describe, it, expect } from 'vitest';
import { StepQueue } from './step-queue.js';

describe('StepQueue', () => {
  const mockSteps = () => [
    { delivery: 'aria' as const, action: 'click', target: { role: 'button', name: 'A' } },
    { delivery: 'aria' as const, action: 'click', target: { role: 'button', name: 'B' } },
  ];

  it('starts ready at position 0', () => {
    const q = new StepQueue('main', mockSteps());
    expect(q.state).toBe('ready');
    expect(q.position).toBe(0);
  });

  it('currentStep returns step at position', () => {
    const q = new StepQueue('main', mockSteps());
    expect((q.currentStep() as any)?.action).toBe('click');
  });

  it('advance increments position', () => {
    const q = new StepQueue('main', mockSteps());
    q.advance();
    expect(q.position).toBe(1);
  });

  it('isDone when position >= steps length', () => {
    const q = new StepQueue('main', mockSteps());
    q.advance();
    q.advance();
    expect(q.isDone()).toBe(true);
  });

  it('block sets state and wakeTime', () => {
    const q = new StepQueue('main', mockSteps());
    q.block(undefined, 500);
    expect(q.state).toBe('blocked');
    expect(q.wakeTime).toBe(500);
  });

  it('unblock sets state to ready', () => {
    const q = new StepQueue('main', mockSteps());
    q.block();
    q.unblock();
    expect(q.state).toBe('ready');
    expect(q.wakeTime).toBeUndefined();
  });

  it('suspend and activate', () => {
    const trigger = { type: 'time' as const, delay: '5s' } as const;
    const q = new StepQueue('main', mockSteps());
    q.suspend(trigger);
    expect(q.state).toBe('suspended');
    expect(q.trigger).toBe(trigger);
    q.activate();
    expect(q.state).toBe('ready');
  });

  it('tracks parent-child relationships', () => {
    const parent = new StepQueue('main', []);
    const child = new StepQueue('branch-a', mockSteps(), parent);
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
  });
});
