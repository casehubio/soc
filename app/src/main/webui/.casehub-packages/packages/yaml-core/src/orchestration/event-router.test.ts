import { describe, it, expect } from 'vitest';
import { EventRouter, type EventMapping } from './event-router.js';
import { DefaultBlockingOrcStateMachine } from './blocking-state-machine.js';
import { valuePattern, anyOfPattern, defaultPattern } from '../match.js';

type S = 'idle' | 'active' | 'done';

function makeSm(initial: S = 'idle') {
  return new DefaultBlockingOrcStateMachine<S>('test', initial);
}

describe('EventRouter', () => {
  it('fires transition when event and state match', () => {
    const sm = makeSm();
    const mappings: EventMapping<S>[] = [{
      fromPattern: valuePattern('idle'),
      onPattern: valuePattern('start'),
      to: 'active',
    }];
    const router = new EventRouter(sm, mappings);
    expect(router.fire('start')).toBe(true);
    expect(sm.currentState()).toBe('active');
  });

  it('returns false when no mapping matches', () => {
    const sm = makeSm();
    const mappings: EventMapping<S>[] = [{
      fromPattern: valuePattern('active'),
      onPattern: valuePattern('finish'),
      to: 'done',
    }];
    const router = new EventRouter(sm, mappings);
    expect(router.fire('finish')).toBe(false);
    expect(sm.currentState()).toBe('idle');
  });

  it('guard predicate can block transition', () => {
    const sm = makeSm();
    const mappings: EventMapping<S>[] = [{
      fromPattern: valuePattern('idle'),
      onPattern: valuePattern('start'),
      to: 'active',
      guard: () => false,
    }];
    const router = new EventRouter(sm, mappings);
    expect(router.fire('start')).toBe(false);
    expect(sm.currentState()).toBe('idle');
  });

  it('anyOf pattern matches multiple events', () => {
    const sm = makeSm();
    const mappings: EventMapping<S>[] = [{
      fromPattern: defaultPattern(),
      onPattern: anyOfPattern(['go', 'start']),
      to: 'active',
    }];
    const router = new EventRouter(sm, mappings);
    expect(router.fire('go')).toBe(true);
    expect(sm.currentState()).toBe('active');
  });

  it('targeting creates router for different state machine', () => {
    const sm1 = makeSm();
    const sm2 = makeSm();
    const mappings: EventMapping<S>[] = [{
      fromPattern: valuePattern('idle'),
      onPattern: valuePattern('start'),
      to: 'active',
    }];
    const router = new EventRouter(sm1, mappings);
    const router2 = router.targeting(sm2);
    router2.fire('start');
    expect(sm1.currentState()).toBe('idle');
    expect(sm2.currentState()).toBe('active');
  });
});
