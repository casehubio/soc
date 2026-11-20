import { describe, it, expect } from 'vitest';
import { DefaultBlockingOrcStateMachine } from './blocking-state-machine.js';

type S = 'idle' | 'active' | 'done';

function makeSm(initial: S = 'idle') {
  return new DefaultBlockingOrcStateMachine<S>('test', initial);
}

describe('DefaultBlockingOrcStateMachine', () => {
  it('currentState returns initial state', () => {
    expect(makeSm().currentState()).toBe('idle');
  });

  it('transition changes state when from matches', () => {
    const sm = makeSm();
    expect(sm.transition('idle', 'active')).toBe(true);
    expect(sm.currentState()).toBe('active');
  });

  it('transition returns false when from does not match', () => {
    const sm = makeSm();
    expect(sm.transition('active', 'done')).toBe(false);
    expect(sm.currentState()).toBe('idle');
  });

  it('onEnter and onExit handlers fire', () => {
    const sm = makeSm();
    const log: string[] = [];
    sm.onExit('idle', () => log.push('exit-idle'));
    sm.onEnter('active', () => log.push('enter-active'));
    sm.transition('idle', 'active');
    expect(log).toEqual(['exit-idle', 'enter-active']);
  });

  it('onTransition handler fires with payload', () => {
    const sm = makeSm();
    let received: unknown;
    sm.onTransition('idle', 'active', payload => { received = payload; });
    sm.transition('idle', 'active', { reason: 'go' });
    expect(received).toEqual({ reason: 'go' });
  });

  it('awaitState resolves immediately if already in state', async () => {
    const sm = makeSm();
    await sm.awaitState('idle');
  });

  it('awaitState resolves when state is reached via transition', async () => {
    const sm = makeSm();
    const p = sm.awaitState('active');
    sm.transition('idle', 'active');
    await p;
    expect(sm.currentState()).toBe('active');
  });

  it('awaitStateWithTimeout returns true when reached in time', async () => {
    const sm = makeSm();
    const p = sm.awaitStateWithTimeout('active', 1000);
    sm.transition('idle', 'active');
    expect(await p).toBe(true);
  });

  it('awaitStateWithTimeout returns false when timeout expires', async () => {
    const sm = makeSm();
    expect(await sm.awaitStateWithTimeout('done', 10)).toBe(false);
  });

  it('awaitTransition resolves when specific transition fires', async () => {
    const sm = makeSm();
    const p = sm.awaitTransition('idle', 'active');
    sm.transition('idle', 'active');
    await p;
  });

  it('awaitAnyState resolves immediately if already in one of targets', async () => {
    const sm = makeSm();
    const result = await sm.awaitAnyState(new Set<S>(['idle', 'done']));
    expect(result).toBe('idle');
  });

  it('awaitAnyState resolves when any target state reached', async () => {
    const sm = makeSm();
    const p = sm.awaitAnyState(new Set<S>(['active', 'done']));
    sm.transition('idle', 'active');
    expect(await p).toBe('active');
  });
});
