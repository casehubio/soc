// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { BlocksDecompositionTree, STRATEGY_COLORS } from './blocks-decomposition-tree.js';
import type {
  DecompositionSnapshot, LeafTaskSnapshot, CompoundTaskSnapshot,
  DecompositionMethodSnapshot, NodeStateSnapshot,
} from '@casehubio/mosaic-graph-stencil-htn';

function leaf(id: string, desc?: string, executor?: string): LeafTaskSnapshot {
  const result: LeafTaskSnapshot = { kind: 'leaf', id, description: desc ?? `Leaf ${id}` };
  if (executor != null) return { ...result, executorName: executor };
  return result;
}

function method(
  strategyId: string,
  children: (LeafTaskSnapshot | CompoundTaskSnapshot)[] = [],
  guardLabel?: string,
): DecompositionMethodSnapshot {
  const result: DecompositionMethodSnapshot = { strategyId, children };
  if (guardLabel != null) return { ...result, guardLabel };
  return result;
}

function compound(
  name: string,
  methods: DecompositionMethodSnapshot[],
): CompoundTaskSnapshot {
  return { kind: 'compound', id: `compound:${name}`, name, methods };
}

function snap(root: LeafTaskSnapshot | CompoundTaskSnapshot): DecompositionSnapshot {
  return { root, timestamp: '2026-08-06T10:00:00Z' };
}

describe('BlocksDecompositionTree', () => {
  it('renders empty state when decomposition is null', () => {
    const el = new BlocksDecompositionTree();
    expect(el.decomposition).toBeNull();
  });

  it('stores decomposition property', () => {
    const el = new BlocksDecompositionTree();
    el.decomposition = snap(leaf('a', 'Test'));
    expect(el.decomposition!.root.kind).toBe('leaf');
  });

  it('stores nodeStates property', () => {
    const el = new BlocksDecompositionTree();
    const states: Record<string, NodeStateSnapshot> = { 'a': { kind: 'Completed' } };
    el.nodeStates = states;
    expect(el.nodeStates!['a']!.kind).toBe('Completed');
  });

  it('stores renderLeaf callback', () => {
    const el = new BlocksDecompositionTree();
    const cb = () => null as any;
    el.renderLeaf = cb;
    expect(el.renderLeaf).toBe(cb);
  });

  it('stores renderMethod callback', () => {
    const el = new BlocksDecompositionTree();
    const cb = () => null as any;
    el.renderMethod = cb;
    expect(el.renderMethod).toBe(cb);
  });

  it('defaults selectionTopic to dag-node', () => {
    const el = new BlocksDecompositionTree();
    expect(el.selectionTopic).toBe('dag-node');
  });

  it('accepts custom selectionTopic', () => {
    const el = new BlocksDecompositionTree();
    el.selectionTopic = 'custom';
    expect(el.selectionTopic).toBe('custom');
  });
});

describe('STRATEGY_COLORS', () => {
  it('has entries for all 8 strategies + unknown fallback', () => {
    const expected = [
      'identity', 'static', 'forward-reasoning', 'llm',
      'hybrid', 'heuristic', 'goal-oriented', 'htn', '_unknown',
    ];
    for (const key of expected) {
      expect(STRATEGY_COLORS[key]).toBeDefined();
      expect(typeof STRATEGY_COLORS[key]).toBe('string');
    }
  });

  it('uses distinct colors for different strategies', () => {
    const nonGray = Object.entries(STRATEGY_COLORS)
      .filter(([k]) => k !== 'identity' && k !== '_unknown')
      .map(([, v]) => v);
    const unique = new Set(nonGray);
    expect(unique.size).toBe(nonGray.length);
  });
});
