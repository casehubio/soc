import { describe, it, expect } from 'vitest';
import {
  stateProgressionStrategy,
  linearResolveStatus,
  QHORUS_STAGES,
} from './state-progression.js';
import type { StageConfig } from '../types.js';

describe('stateProgressionStrategy', () => {
  describe('toNodes with default stages', () => {
    it('maps each qhorus stage to a node', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'OPEN' });
      expect(nodes).toHaveLength(QHORUS_STAGES.length);
      expect(nodes.map(n => n.key)).toEqual(QHORUS_STAGES.map(s => s.key));
    });

    it('uses stage label as node label', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'OPEN' });
      expect(nodes[0]!.label).toBe('Open');
      expect(nodes[1]!.label).toBe('Acknowledged');
    });

    it('marks currentState as active for non-terminal stages', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'ACKNOWLEDGED' });
      const ack = nodes.find(n => n.key === 'ACKNOWLEDGED')!;
      expect(ack.status).toBe('active');
    });

    it('marks terminal success currentState as completed', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'FULFILLED' });
      const fulfilled = nodes.find(n => n.key === 'FULFILLED')!;
      expect(fulfilled.status).toBe('completed');
    });

    it('marks terminal failure currentState as failed', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'DECLINED' });
      const declined = nodes.find(n => n.key === 'DECLINED')!;
      expect(declined.status).toBe('failed');
    });

    it('marks FAILED terminal state as failed', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'FAILED' });
      expect(nodes.find(n => n.key === 'FAILED')!.status).toBe('failed');
    });

    it('marks EXPIRED terminal state as failed', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'EXPIRED' });
      expect(nodes.find(n => n.key === 'EXPIRED')!.status).toBe('failed');
    });

    it('marks DELEGATED as completed (terminal transfer)', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({
        currentState: 'DELEGATED',
        transitions: [{ state: 'OPEN' }, { state: 'DELEGATED' }],
      });
      expect(nodes.find(n => n.key === 'DELEGATED')!.status).toBe('completed');
    });

    it('marks visited stages from transitions as completed', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [
          { state: 'OPEN', actor: 'system', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'ACKNOWLEDGED', actor: 'agent-1', timestamp: '2026-01-01T01:00:00Z' },
        ],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('completed');
    });

    it('marks unvisited stages as skipped when transitions provided', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({
        currentState: 'DECLINED',
        transitions: [
          { state: 'OPEN', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'DECLINED', timestamp: '2026-01-01T01:00:00Z' },
        ],
      });
      expect(nodes.find(n => n.key === 'ACKNOWLEDGED')!.status).toBe('skipped');
      expect(nodes.find(n => n.key === 'FULFILLED')!.status).toBe('skipped');
    });

    it('marks all non-current stages as pending when no transitions', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'ACKNOWLEDGED' });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('pending');
      expect(nodes.find(n => n.key === 'FULFILLED')!.status).toBe('pending');
    });

    it('populates actor and timestamp from transitions', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [
          { state: 'OPEN', actor: 'requester-1', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'ACKNOWLEDGED', actor: 'agent-1', timestamp: '2026-01-01T01:00:00Z' },
        ],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.actor).toBe('requester-1');
      expect(nodes.find(n => n.key === 'OPEN')!.timestamp).toBe('2026-01-01T00:00:00Z');
      expect(nodes.find(n => n.key === 'ACKNOWLEDGED')!.actor).toBe('agent-1');
    });

    it('leaves actor/timestamp undefined for stages without transitions', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'OPEN' });
      expect(nodes.find(n => n.key === 'FULFILLED')!.actor).toBeUndefined();
      expect(nodes.find(n => n.key === 'FULFILLED')!.timestamp).toBeUndefined();
    });
  });

  describe('toNodes with custom stages', () => {
    it('uses custom stage definitions', () => {
      const stages: StageConfig[] = [
        { key: 'DRAFT', label: 'Draft' },
        { key: 'SUBMITTED', label: 'Submitted' },
        { key: 'APPROVED', label: 'Approved', terminal: 'success' },
        { key: 'REJECTED', label: 'Rejected', terminal: 'failure' },
      ];
      const strategy = stateProgressionStrategy({ stages });
      const nodes = strategy.toNodes({ currentState: 'SUBMITTED' });
      expect(nodes).toHaveLength(4);
      expect(nodes[0]!.label).toBe('Draft');
      expect(nodes[1]!.label).toBe('Submitted');
      expect(nodes[1]!.status).toBe('active');
    });
  });

  describe('toNodes with custom resolveStatus', () => {
    it('uses custom resolver', () => {
      const strategy = stateProgressionStrategy({
        resolveStatus: () => 'completed',
      });
      const nodes = strategy.toNodes({ currentState: 'OPEN' });
      expect(nodes.every(n => n.status === 'completed')).toBe(true);
    });

    it('passes all four arguments to resolver', () => {
      const calls: unknown[][] = [];
      const strategy = stateProgressionStrategy({
        resolveStatus: (...args) => {
          calls.push(args);
          return 'pending';
        },
      });
      strategy.toNodes({
        currentState: 'OPEN',
        transitions: [{ state: 'OPEN' }],
      });
      expect(calls.length).toBe(QHORUS_STAGES.length);
      expect(calls[0]).toHaveLength(4);
      expect((calls[0]![0] as StageConfig).key).toBe('OPEN');
      expect(calls[0]![1]).toBe('OPEN');
      expect(calls[0]![2]).toEqual([{ state: 'OPEN' }]);
      expect(calls[0]![3]).toBe(QHORUS_STAGES);
    });
  });

  describe('toNodes edge cases', () => {
    it('handles empty transitions array', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'OPEN', transitions: [] });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('active');
      expect(nodes.find(n => n.key === 'ACKNOWLEDGED')!.status).toBe('pending');
    });

    it('handles unknown currentState — all pending', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({ currentState: 'NONEXISTENT' });
      expect(nodes.every(n => n.status === 'pending')).toBe(true);
    });

    it('handles duplicate transitions gracefully', () => {
      const strategy = stateProgressionStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [
          { state: 'OPEN', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'OPEN', timestamp: '2026-01-01T00:01:00Z' },
          { state: 'ACKNOWLEDGED', timestamp: '2026-01-01T01:00:00Z' },
        ],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('completed');
    });
  });

  describe('defaultLayout', () => {
    it('is horizontal', () => {
      expect(stateProgressionStrategy().defaultLayout).toBe('horizontal');
    });
  });

  describe('filterCategories', () => {
    it('is undefined', () => {
      expect(stateProgressionStrategy().filterCategories).toBeUndefined();
    });
  });
});

describe('linearResolveStatus', () => {
  const stages: StageConfig[] = [
    { key: 'A', label: 'A' },
    { key: 'B', label: 'B' },
    { key: 'C', label: 'C', terminal: 'success' },
    { key: 'D', label: 'D', terminal: 'failure' },
    { key: 'E', label: 'E', terminal: 'transfer' },
  ];

  it('marks stages before current as completed', () => {
    expect(linearResolveStatus(stages[0]!, 'B', [], stages)).toBe('completed');
  });

  it('marks current non-terminal as active', () => {
    expect(linearResolveStatus(stages[1]!, 'B', [], stages)).toBe('active');
  });

  it('marks current terminal success as completed', () => {
    expect(linearResolveStatus(stages[2]!, 'C', [], stages)).toBe('completed');
  });

  it('marks current terminal failure as failed', () => {
    expect(linearResolveStatus(stages[3]!, 'D', [], stages)).toBe('failed');
  });

  it('marks stages after current as pending', () => {
    expect(linearResolveStatus(stages[2]!, 'B', [], stages)).toBe('pending');
    expect(linearResolveStatus(stages[3]!, 'B', [], stages)).toBe('pending');
  });

  it('marks current terminal transfer as completed', () => {
    expect(linearResolveStatus(stages[4]!, 'E', [], stages)).toBe('completed');
  });

  it('handles unknown current state — all pending', () => {
    expect(linearResolveStatus(stages[0]!, 'UNKNOWN', [], stages)).toBe('pending');
    expect(linearResolveStatus(stages[1]!, 'UNKNOWN', [], stages)).toBe('pending');
  });

  it('matches signature of resolveStatus callback (4 params)', () => {
    const strategy = stateProgressionStrategy({ stages, resolveStatus: linearResolveStatus });
    const nodes = strategy.toNodes({ currentState: 'B' });
    expect(nodes[0]!.status).toBe('completed');
    expect(nodes[1]!.status).toBe('active');
    expect(nodes[2]!.status).toBe('pending');
  });
});

describe('QHORUS_STAGES', () => {
  it('has 7 stages', () => {
    expect(QHORUS_STAGES).toHaveLength(7);
  });

  it('has FULFILLED as terminal success', () => {
    expect(QHORUS_STAGES.find(s => s.key === 'FULFILLED')!.terminal).toBe('success');
  });

  it('has DECLINED, FAILED, EXPIRED as terminal failure', () => {
    expect(QHORUS_STAGES.find(s => s.key === 'DECLINED')!.terminal).toBe('failure');
    expect(QHORUS_STAGES.find(s => s.key === 'FAILED')!.terminal).toBe('failure');
    expect(QHORUS_STAGES.find(s => s.key === 'EXPIRED')!.terminal).toBe('failure');
  });

  it('has OPEN, ACKNOWLEDGED without terminal', () => {
    expect(QHORUS_STAGES.find(s => s.key === 'OPEN')!.terminal).toBeUndefined();
    expect(QHORUS_STAGES.find(s => s.key === 'ACKNOWLEDGED')!.terminal).toBeUndefined();
  });

  it('has DELEGATED as terminal transfer', () => {
    expect(QHORUS_STAGES.find(s => s.key === 'DELEGATED')!.terminal).toBe('transfer');
  });
});
