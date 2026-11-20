// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '@casehubio/mosaic-core';
import { toDecorations } from './runtime-adapter.js';
import type { CaseRuntimeState, PlanItemSnapshot, TrustScoreSnapshot, AdaptiveDecisionSnapshot } from './types.js';

function makeState(
  planItems: PlanItemSnapshot[] = [],
  milestones: CaseRuntimeState['milestones'] = [],
): CaseRuntimeState {
  return { planItems, milestones, timestamp: '2026-08-04T10:00:00Z' };
}

function planItem(bindingName: string, status: string, createdAt = '2026-08-04T10:00:00Z'): PlanItemSnapshot {
  return { id: `pi-${bindingName}-${status}`, bindingName, status: status as PlanItemSnapshot['status'], createdAt };
}

function makeStateWithTrust(
  planItems: PlanItemSnapshot[] = [],
  trustScores: TrustScoreSnapshot[] = [],
): CaseRuntimeState {
  return { planItems, milestones: [], timestamp: '2026-08-04T10:00:00Z', trustScores };
}

function makeStateWithAdaptive(
  planItems: PlanItemSnapshot[] = [],
  adaptiveDecisions: AdaptiveDecisionSnapshot[] = [],
): CaseRuntimeState {
  return { planItems, milestones: [], timestamp: '2026-08-04T10:00:00Z', adaptiveDecisions };
}

describe('toDecorations', () => {
  it('returns empty map for empty state', () => {
    const result = toDecorations(makeState());
    expect(result.size).toBe(0);
  });

  it('maps single PlanItem to binding node decoration', () => {
    const result = toDecorations(makeState([planItem('extract-text', 'RUNNING')]));
    const dec = result.get('binding:extract-text');
    expect(dec).toBeDefined();
    expect(dec!.badge!.icon).toBe('▶');
    expect(dec!.badge!.color).toBe('#22c55e');
    expect(dec!.badge!.pulse).toBe(true);
    expect(dec!.border).toBeDefined();
  });

  it('applies active-worst-first: SUSPENDED > RUNNING', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'RUNNING'),
      planItem('b1', 'SUSPENDED'),
    ]));
    const dec = result.get('binding:b1');
    expect(dec!.badge!.icon).toBe('⏸');
    expect(dec!.badge!.count).toBe(2);
  });

  it('applies active-worst-first: any active wins over terminal', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'COMPLETED', '2026-08-04T09:00:00Z'),
      planItem('b1', 'PENDING', '2026-08-04T10:00:00Z'),
    ]));
    expect(result.get('binding:b1')!.badge!.icon).toBe('○');
  });

  it('picks most recent terminal when all terminal', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'COMPLETED', '2026-08-04T09:00:00Z'),
      planItem('b1', 'FAULTED', '2026-08-04T10:00:00Z'),
    ]));
    expect(result.get('binding:b1')!.badge!.icon).toBe('!');
  });

  it('uses severity tiebreaker when terminal timestamps match', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'COMPLETED', '2026-08-04T10:00:00Z'),
      planItem('b1', 'FAULTED', '2026-08-04T10:00:00Z'),
    ]));
    expect(result.get('binding:b1')!.badge!.icon).toBe('!');
  });

  it('sets count when multiple PlanItems per binding', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'COMPLETED'),
      planItem('b1', 'COMPLETED'),
      planItem('b1', 'FAULTED'),
    ]));
    expect(result.get('binding:b1')!.badge!.count).toBe(3);
  });

  it('omits count for single PlanItem', () => {
    const result = toDecorations(makeState([planItem('b1', 'RUNNING')]));
    expect(result.get('binding:b1')!.badge!.count).toBeUndefined();
  });

  it('generates tooltip with breakdown', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'COMPLETED'),
      planItem('b1', 'COMPLETED'),
      planItem('b1', 'FAULTED'),
    ]));
    expect(result.get('binding:b1')!.tooltip).toBe('3 plan items: 2 completed, 1 faulted');
  });

  it('generates tooltip with just status name for single item', () => {
    const result = toDecorations(makeState([planItem('b1', 'RUNNING')]));
    expect(result.get('binding:b1')!.tooltip).toBe('running');
  });

  it('maps milestone to decoration', () => {
    const result = toDecorations(makeState([], [{ name: 'text-extracted', status: 'ACTIVE' }]));
    const dec = result.get('milestone:text-extracted');
    expect(dec).toBeDefined();
    expect(dec!.badge!.icon).toBe('◉');
    expect(dec!.badge!.pulse).toBe(true);
  });

  it('handles unknown TaskStatus with fallback decoration', () => {
    const result = toDecorations(makeState([planItem('b1', 'UNKNOWN_FUTURE_STATUS' as any)]));
    expect(result.get('binding:b1')!.badge!.icon).toBe('?');
  });

  it('handles multiple bindings independently', () => {
    const result = toDecorations(makeState([
      planItem('b1', 'RUNNING'),
      planItem('b2', 'COMPLETED'),
    ]));
    expect(result.get('binding:b1')!.badge!.icon).toBe('▶');
    expect(result.get('binding:b2')!.badge!.icon).toBe('✓');
  });
});

describe('toDecorations — trust scores', () => {
  it('adds trust score pill to binding decoration', () => {
    const result = toDecorations(makeStateWithTrust(
      [planItem('extract-text', 'RUNNING')],
      [{ bindingName: 'extract-text', workerId: 'w1', score: 85 }],
    ));
    const dec = result.get('binding:extract-text');
    expect(dec).toBeDefined();
    expect(dec!.pills).toBeDefined();
    expect(dec!.pills).toHaveLength(1);
    expect(dec!.pills![0].text).toBe('85');
    expect(dec!.pills![0].color).toBe('#22c55e');
  });

  it('uses amber for moderate trust score', () => {
    const result = toDecorations(makeStateWithTrust(
      [planItem('b1', 'COMPLETED')],
      [{ bindingName: 'b1', workerId: 'w1', score: 65 }],
    ));
    expect(result.get('binding:b1')!.pills![0].color).toBe('#eab308');
  });

  it('uses red for low trust score', () => {
    const result = toDecorations(makeStateWithTrust(
      [planItem('b1', 'COMPLETED')],
      [{ bindingName: 'b1', workerId: 'w1', score: 30 }],
    ));
    expect(result.get('binding:b1')!.pills![0].color).toBe('#ef4444');
  });

  it('skips trust pill when no matching binding in plan items', () => {
    const result = toDecorations(makeStateWithTrust(
      [planItem('b1', 'RUNNING')],
      [{ bindingName: 'b-other', workerId: 'w1', score: 90 }],
    ));
    expect(result.get('binding:b1')!.pills).toBeUndefined();
  });

  it('handles boundary score 80 as green', () => {
    const result = toDecorations(makeStateWithTrust(
      [planItem('b1', 'COMPLETED')],
      [{ bindingName: 'b1', workerId: 'w1', score: 80 }],
    ));
    expect(result.get('binding:b1')!.pills![0].color).toBe('#22c55e');
  });

  it('handles boundary score 50 as amber', () => {
    const result = toDecorations(makeStateWithTrust(
      [planItem('b1', 'COMPLETED')],
      [{ bindingName: 'b1', workerId: 'w1', score: 50 }],
    ));
    expect(result.get('binding:b1')!.pills![0].color).toBe('#eab308');
  });
});

describe('toDecorations — adaptive decisions', () => {
  it('adds tooltip for fired adaptive decision on affected binding', () => {
    const result = toDecorations(makeStateWithAdaptive(
      [planItem('b1', 'RUNNING')],
      [{
        trigger: 'trust-drop', condition: 'score < 50', fired: true,
        timestamp: '2026-08-04T10:01:00Z', affectedBindings: ['b1'],
      }],
    ));
    const dec = result.get('binding:b1');
    expect(dec!.tooltip).toContain('trust-drop');
    expect(dec!.tooltip).toContain('score < 50');
  });

  it('does not modify decoration for unfired adaptive decision', () => {
    const result = toDecorations(makeStateWithAdaptive(
      [planItem('b1', 'RUNNING')],
      [{
        trigger: 'trust-drop', condition: 'score < 50', fired: false,
        timestamp: '2026-08-04T10:01:00Z', affectedBindings: ['b1'],
      }],
    ));
    const dec = result.get('binding:b1');
    expect(dec!.tooltip).toBe('running');
  });

  it('handles adaptive decision with no affectedBindings', () => {
    const result = toDecorations(makeStateWithAdaptive(
      [planItem('b1', 'RUNNING')],
      [{
        trigger: 'trust-drop', condition: 'score < 50', fired: true,
        timestamp: '2026-08-04T10:01:00Z',
      }],
    ));
    const dec = result.get('binding:b1');
    expect(dec!.tooltip).toBe('running');
  });
});
