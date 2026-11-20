// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { BlocksPlanItemTree, completionLabel, COMPLETION_COLORS } from './blocks-plan-item-tree.js';
import type { PrimitivePlanItem, CompoundPlanItem, PlanItemDefinition } from '@casehubio/mosaic-graph-stencil-htn';

function primitive(id: string, name: string, executor = 'exec-1'): PrimitivePlanItem {
  return { kind: 'primitive', id, name, executor: { name: executor } };
}

function compound(
  id: string,
  name: string,
  children: PlanItemDefinition[],
  completion: { kind: 'All' } | { kind: 'MOfN'; m: number } | { kind: 'FirstWins' } = { kind: 'All' },
): CompoundPlanItem {
  return {
    kind: 'compound', id, name, children,
    completion, dispatchMode: 'ORCHESTRATED', repeatable: false,
  };
}

describe('BlocksPlanItemTree', () => {
  it('renders empty state when definition is null', () => {
    const el = new BlocksPlanItemTree();
    expect(el.definition).toBeNull();
  });

  it('stores definition property', () => {
    const el = new BlocksPlanItemTree();
    el.definition = primitive('p1', 'Task A');
    expect(el.definition!.kind).toBe('primitive');
  });

  it('stores renderPrimitive callback', () => {
    const el = new BlocksPlanItemTree();
    const cb = () => null as any;
    el.renderPrimitive = cb;
    expect(el.renderPrimitive).toBe(cb);
  });

  it('stores renderCompound callback', () => {
    const el = new BlocksPlanItemTree();
    const cb = () => null as any;
    el.renderCompound = cb;
    expect(el.renderCompound).toBe(cb);
  });

  it('accepts compound with nested children', () => {
    const el = new BlocksPlanItemTree();
    el.definition = compound('c1', 'Root', [
      primitive('p1', 'Child A'),
      compound('c2', 'Sub', [primitive('p2', 'Grandchild')]),
    ]);
    expect(el.definition!.kind).toBe('compound');
    expect((el.definition as CompoundPlanItem).children).toHaveLength(2);
  });
});

describe('completionLabel', () => {
  it('renders All', () => expect(completionLabel({ kind: 'All' })).toBe('All'));
  it('renders MOfN', () => expect(completionLabel({ kind: 'MOfN', m: 3 })).toBe('3-of-N'));
  it('renders FirstWins', () => expect(completionLabel({ kind: 'FirstWins' })).toBe('First Wins'));
});

describe('COMPLETION_COLORS', () => {
  it('has entries for all 3 semantics', () => {
    expect(COMPLETION_COLORS['All']).toBeDefined();
    expect(COMPLETION_COLORS['MOfN']).toBeDefined();
    expect(COMPLETION_COLORS['FirstWins']).toBeDefined();
  });
});
