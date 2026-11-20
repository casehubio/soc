import { describe, it, expect } from 'vitest';
import { StateMachineBuilder } from './state-machine.js';
import { IllegalTransitionError } from './errors.js';

describe('DefaultOrcStateMachine', () => {
  const buildSimple = () =>
    new StateMachineBuilder<'idle' | 'running' | 'done'>('test', 'idle')
      .transition('idle', 'running')
      .transition('running', 'done')
      .terminal('done')
      .build();

  it('starts in initial state', () => {
    const sm = buildSimple();
    expect(sm.currentState()).toBe('idle');
  });

  it('transitions between valid states', () => {
    const sm = buildSimple();
    expect(sm.transition('idle', 'running')).toBe(true);
    expect(sm.currentState()).toBe('running');
  });

  it('rejects transition from wrong current state', () => {
    const sm = buildSimple();
    expect(sm.transition('running', 'done')).toBe(false);
    expect(sm.currentState()).toBe('idle');
  });

  it('rejects undeclared transition', () => {
    const sm = buildSimple();
    expect(() => sm.transition('idle', 'done')).toThrow(IllegalTransitionError);
  });

  it('rejects transition from terminal state', () => {
    const sm = buildSimple();
    sm.transition('idle', 'running');
    sm.transition('running', 'done');
    expect(() => sm.transition('done', 'idle')).toThrow(IllegalTransitionError);
  });

  it('fires onEnter and onExit handlers', () => {
    const log: string[] = [];
    const sm = new StateMachineBuilder<'a' | 'b'>('test', 'a')
      .transition('a', 'b')
      .build();
    sm.onExit('a', () => log.push('exit-a'));
    sm.onEnter('b', () => log.push('enter-b'));
    sm.transition('a', 'b');
    expect(log).toEqual(['exit-a', 'enter-b']);
  });

  it('fires onTransition handler with payload', () => {
    let captured: unknown;
    const sm = new StateMachineBuilder<'a' | 'b'>('test', 'a')
      .transition('a', 'b')
      .build();
    sm.onTransition('a', 'b', (payload) => { captured = payload; });
    sm.transition('a', 'b', 'my-data');
    expect(captured).toBe('my-data');
  });

  it('guard blocks transition when predicate returns false', () => {
    const sm = new StateMachineBuilder<'a' | 'b'>('test', 'a')
      .transition('a', 'b')
      .guard('a', 'b', () => false)
      .build();
    expect(sm.transition('a', 'b')).toBe(false);
    expect(sm.currentState()).toBe('a');
  });
});
