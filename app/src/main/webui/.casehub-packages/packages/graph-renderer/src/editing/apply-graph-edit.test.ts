import { describe, it, expect, beforeEach } from 'vitest';
import { createGraph, clearGrammarRegistry } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge } from '@casehubio/graph-core';
import { applyGraphEdit } from './apply-graph-edit.js';

function node(id: string, type = 'step'): GraphNode {
  return { id, type, properties: {} };
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target };
}

describe('applyGraphEdit — removeSegment', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('removes segment and creates bridge edge (auto-join)', () => {
    // A→B→C→D — remove {B,C}, bridge A→D
    const model = createGraph(
      [node('A'), node('B'), node('C'), node('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D')],
    );
    const result = applyGraphEdit(model, {
      type: 'removeSegment',
      nodeIds: new Set(['B', 'C']),
      bridgeEdge: { sourceId: 'A', targetId: 'D', edgeType: 'default' },
    });
    expect(result.model.nodes).toHaveLength(2);
    expect(result.model.nodes.map(n => n.id).sort()).toEqual(['A', 'D']);
    expect(result.model.edges).toHaveLength(1);
    expect(result.model.edges[0]!.source).toBe('A');
    expect(result.model.edges[0]!.target).toBe('D');
    expect(result.model.edges[0]!.type).toBe('default');
  });

  it('removes segment without bridge (disconnect)', () => {
    // A→B→C→D — remove {B,C} with no bridge
    const model = createGraph(
      [node('A'), node('B'), node('C'), node('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D')],
    );
    const result = applyGraphEdit(model, {
      type: 'removeSegment',
      nodeIds: new Set(['B', 'C']),
    });
    expect(result.model.nodes).toHaveLength(2);
    expect(result.model.nodes.map(n => n.id).sort()).toEqual(['A', 'D']);
    expect(result.model.edges).toHaveLength(0);
  });

  it('removes a single node with bridge', () => {
    // A→B→C — remove {B}, bridge A→C
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const result = applyGraphEdit(model, {
      type: 'removeSegment',
      nodeIds: new Set(['B']),
      bridgeEdge: { sourceId: 'A', targetId: 'C', edgeType: 'default' },
    });
    expect(result.model.nodes).toHaveLength(2);
    expect(result.model.edges).toHaveLength(1);
    expect(result.model.edges[0]!.source).toBe('A');
    expect(result.model.edges[0]!.target).toBe('C');
  });

  it('preserves edge type from bridge specification', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B', 'conditional'), edge('e2', 'B', 'C')],
    );
    const result = applyGraphEdit(model, {
      type: 'removeSegment',
      nodeIds: new Set(['B']),
      bridgeEdge: { sourceId: 'A', targetId: 'C', edgeType: 'conditional' },
    });
    expect(result.model.edges[0]!.type).toBe('conditional');
  });
});

describe('applyGraphEdit — moveSegmentToEdge', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('moves a segment from one edge to another', () => {
    // Chain 1: A→B→C→D (segment {B,C} to be moved)
    // Chain 2: X→Y (target edge to splice onto)
    const model = createGraph(
      [node('A'), node('B'), node('C'), node('D'), node('X'), node('Y')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D'), edge('e4', 'X', 'Y')],
    );
    const result = applyGraphEdit(model, {
      type: 'moveSegmentToEdge',
      nodeIds: new Set(['B', 'C']),
      entryNodeId: 'B',
      exitNodeId: 'C',
      edgeId: 'e4',
      bridgeEdge: { sourceId: 'A', targetId: 'D', edgeType: 'default' },
    });
    // Source: A→D bridge, B and C disconnected from old position
    // Target: X→B, C→Y (segment spliced in)
    expect(result.model.nodes).toHaveLength(6);
    const edgePairs = result.model.edges.map(e => `${e.source}→${e.target}`).sort();
    expect(edgePairs).toContain('A→D');
    expect(edgePairs).toContain('X→B');
    expect(edgePairs).toContain('C→Y');
    expect(edgePairs).toContain('B→C');
  });

  it('preserves internal edges within the moved segment', () => {
    // Source2→Clean→Lookup→Format→Report, move {Clean,Lookup} to X→Y
    const model = createGraph(
      [node('S2'), node('Cl'), node('Lu'), node('Fm'), node('Rp'), node('X'), node('Y')],
      [edge('e1', 'S2', 'Cl'), edge('e2', 'Cl', 'Lu'), edge('e3', 'Lu', 'Fm'), edge('e4', 'Fm', 'Rp'), edge('e5', 'X', 'Y')],
    );
    const result = applyGraphEdit(model, {
      type: 'moveSegmentToEdge',
      nodeIds: new Set(['Cl', 'Lu']),
      entryNodeId: 'Cl',
      exitNodeId: 'Lu',
      edgeId: 'e5',
      bridgeEdge: { sourceId: 'S2', targetId: 'Fm', edgeType: 'default' },
    });
    expect(result.model.nodes).toHaveLength(7);
    const edgePairs = result.model.edges.map(e => `${e.source}→${e.target}`).sort();
    expect(edgePairs).toContain('S2→Fm');
    expect(edgePairs).toContain('X→Cl');
    expect(edgePairs).toContain('Lu→Y');
    expect(edgePairs).toContain('Cl→Lu');
    expect(edgePairs).toContain('Fm→Rp');
    expect(edgePairs).not.toContain('S2→Cl');
    expect(edgePairs).not.toContain('Lu→Fm');
  });

  it('preserves bridge edge type', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C'), node('X'), node('Y')],
      [edge('e1', 'A', 'B', 'conditional'), edge('e2', 'B', 'C'), edge('e3', 'X', 'Y')],
    );
    const result = applyGraphEdit(model, {
      type: 'moveSegmentToEdge',
      nodeIds: new Set(['B']),
      entryNodeId: 'B',
      exitNodeId: 'B',
      edgeId: 'e3',
      bridgeEdge: { sourceId: 'A', targetId: 'C', edgeType: 'conditional' },
    });
    const bridge = result.model.edges.find(e => e.source === 'A' && e.target === 'C');
    expect(bridge).toBeDefined();
    expect(bridge!.type).toBe('conditional');
  });
});
