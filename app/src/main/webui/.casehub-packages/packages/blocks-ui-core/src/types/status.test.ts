import { describe, it, expect } from 'vitest';
import { lookupStatus, registerStatus } from './status.js';

describe('lookupStatus', () => {
  it('returns exact domain:state match', () => {
    const d = lookupStatus('case', 'STARTING');
    expect(d.category).toBe('info');
    expect(d.icon).toBe('◐');
  });

  it('falls back to cross-domain default when domain provided', () => {
    const d = lookupStatus('case', 'COMPLETED');
    expect(d.category).toBe('success');
    expect(d.icon).toBe('✓');
  });

  it('uses cross-domain default when domain is undefined', () => {
    const d = lookupStatus(undefined, 'COMPLETED');
    expect(d.category).toBe('success');
  });

  it('returns fallback for unknown state', () => {
    const d = lookupStatus('case', 'NONEXISTENT');
    expect(d.category).toBe('neutral');
    expect(d.icon).toBe('?');
  });

  it('does not scan per-domain entries when domain is undefined', () => {
    const d = lookupStatus(undefined, 'STARTING');
    expect(d.category).toBe('neutral');
    expect(d.icon).toBe('?');
  });

  describe('all built-in domains resolve', () => {
    const domains: Array<[string, string[]]> = [
      ['case', ['STARTING', 'RUNNING', 'WAITING', 'SUSPENDED', 'COMPLETED', 'FAULTED', 'CANCELLED']],
      ['task', ['PENDING', 'RUNNING', 'DELEGATED', 'SUSPENDED', 'COMPLETED', 'FAULTED', 'REJECTED', 'OBSOLETE', 'CANCELLED']],
      ['workitem', ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAULTED', 'DELEGATED', 'SUSPENDED', 'CANCELLED', 'EXPIRED', 'ESCALATED', 'OBSOLETE']],
      ['milestone', ['PENDING', 'ACTIVE', 'COMPLETED']],
      ['outcome', ['SUCCESS', 'DECLINED', 'FAILED', 'EXPIRED', 'ESCALATED', 'COMPLETED']],
      ['group', ['IN_PROGRESS', 'COMPLETED', 'REJECTED']],
      ['sla', ['NOT_STARTED', 'ON_TRACK', 'BREACHED']],
      ['node', ['PENDING', 'DISPATCHED', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED']],
      ['session', ['ACTIVE', 'WAITING', 'IDLE']],
      ['commitment', ['OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'FAILED', 'DECLINED', 'DELEGATED', 'EXPIRED']],
      ['execution', ['IDLE', 'RUNNING', 'WAITING_FOR_AGENT', 'WAITING_FOR_EVENT', 'COMPLETE', 'FAULTED', 'CANCELLED']],
      ['agent', ['SUCCESS', 'FAILURE', 'TIMEOUT', 'DECLINED']],
      ['pattern', ['SEQUENCE', 'PARALLEL', 'LOOP', 'CONDITIONAL', 'SUPERVISOR', 'DEBATE', 'VOTING', 'HTN']],
    ];

    for (const [domain, states] of domains) {
      for (const state of states) {
        it(`${domain}:${state} resolves to a non-fallback descriptor`, () => {
          const d = lookupStatus(domain, state);
          expect(d.icon).not.toBe('?');
        });
      }
    }
  });
});

describe('execution domain', () => {
  it('IDLE is neutral', () => {
    const d = lookupStatus('execution', 'IDLE');
    expect(d.category).toBe('neutral');
    expect(d.icon).toBe('○');
  });

  it('RUNNING is active with pulse and border', () => {
    const d = lookupStatus('execution', 'RUNNING');
    expect(d.category).toBe('active');
    expect(d.icon).toBe('▶');
    expect(d.pulse).toBe(true);
    expect(d.border).toBe(true);
  });

  it('WAITING_FOR_AGENT is warning with border', () => {
    const d = lookupStatus('execution', 'WAITING_FOR_AGENT');
    expect(d.category).toBe('warning');
    expect(d.border).toBe(true);
  });

  it('FAULTED is danger with pulse', () => {
    const d = lookupStatus('execution', 'FAULTED');
    expect(d.category).toBe('danger');
    expect(d.pulse).toBe(true);
  });

  it('COMPLETE is success', () => {
    const d = lookupStatus('execution', 'COMPLETE');
    expect(d.category).toBe('success');
  });
});

describe('agent domain', () => {
  it('SUCCESS is success', () => {
    expect(lookupStatus('agent', 'SUCCESS').category).toBe('success');
  });

  it('FAILURE is danger', () => {
    expect(lookupStatus('agent', 'FAILURE').category).toBe('danger');
  });

  it('TIMEOUT is warning', () => {
    expect(lookupStatus('agent', 'TIMEOUT').category).toBe('warning');
  });

  it('DECLINED is neutral', () => {
    expect(lookupStatus('agent', 'DECLINED').category).toBe('neutral');
  });
});

describe('pattern domain', () => {
  it.each([
    'SEQUENCE', 'PARALLEL', 'LOOP', 'CONDITIONAL',
    'SUPERVISOR', 'DEBATE', 'VOTING', 'HTN',
  ])('%s is info category', (pattern) => {
    const d = lookupStatus('pattern', pattern);
    expect(d.category).toBe('info');
    expect(d.icon).not.toBe('?');
  });

  it('SEQUENCE has arrow icon', () => {
    expect(lookupStatus('pattern', 'SEQUENCE').icon).toBe('→');
  });

  it('PARALLEL has double arrow icon', () => {
    expect(lookupStatus('pattern', 'PARALLEL').icon).toBe('⇉');
  });
});

describe('registerStatus', () => {
  it('overrides existing registration', () => {
    registerStatus('_test', 'FOO', { category: 'danger', icon: 'X' });
    expect(lookupStatus('_test', 'FOO').category).toBe('danger');
    registerStatus('_test', 'FOO', { category: 'success', icon: 'Y' });
    expect(lookupStatus('_test', 'FOO').category).toBe('success');
  });
});
