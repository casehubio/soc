// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { dagToDecorations, nodeStatesToTaskStates } from './dag-runtime.js';
import type { DagResultSnapshot, DagPlanSnapshot, NodeStateSnapshot } from '../types/index.js';

function result(states: Record<string, { kind: string; reason?: string }>): DagResultSnapshot {
  const nodeStates: Record<string, NodeStateSnapshot> = {};
  for (const [k, v] of Object.entries(states)) {
    nodeStates[k] = v as NodeStateSnapshot;
  }
  return { nodeStates, allSucceeded: false, elapsed: 'PT1S', timestamp: '2026-08-06T10:00:00Z' };
}

describe('dagToDecorations', () => {
  it('maps all 6 NodeStateKind values to decorations', () => {
    const r = result({
      a: { kind: 'Pending' }, b: { kind: 'Dispatched' },
      c: { kind: 'Completed' }, d: { kind: 'Failed' },
      e: { kind: 'Skipped' }, f: { kind: 'Cancelled' },
    });
    const decs = dagToDecorations(r);
    expect(decs.size).toBe(6);
    expect(decs.get('dag:a')!.badge).toBeDefined();
    expect(decs.get('dag:b')!.badge).toBeDefined();
    expect(decs.get('dag:c')!.badge).toBeDefined();
    expect(decs.get('dag:d')!.badge).toBeDefined();
    expect(decs.get('dag:e')!.badge).toBeDefined();
    expect(decs.get('dag:f')!.badge).toBeDefined();
  });

  it('produces correct key format dag:${nodeId}', () => {
    const decs = dagToDecorations(result({ 'node-42': { kind: 'Completed' } }));
    expect(decs.has('dag:node-42')).toBe(true);
  });

  it('returns empty map for empty nodeStates', () => {
    const decs = dagToDecorations(result({}));
    expect(decs.size).toBe(0);
  });
});

describe('nodeStatesToTaskStates', () => {
  it('re-keys by taskId', () => {
    const plan: DagPlanSnapshot = {
      nodes: { n1: { id: 'n1', taskId: 'my-task', dependsOn: [], joinType: 'ALL_OF' } },
      timestamp: '2026-08-06T10:00:00Z',
    };
    const r = result({ n1: { kind: 'Completed' } });
    const states = nodeStatesToTaskStates(plan, r);
    expect(states['my-task']).toEqual({ kind: 'Completed' });
    expect(states['n1']).toBeUndefined();
  });

  it('skips nodes not in plan', () => {
    const plan: DagPlanSnapshot = { nodes: {}, timestamp: '2026-08-06T10:00:00Z' };
    const r = result({ orphan: { kind: 'Failed' } });
    const states = nodeStatesToTaskStates(plan, r);
    expect(Object.keys(states)).toHaveLength(0);
  });
});
