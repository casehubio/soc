import { describe, it, expect } from 'vitest';
import { toReactFlowNode, toReactFlowEdge, toReactFlowGraph } from './mapping.js';
import type { GraphNode, GraphEdge, GraphModel, NodeDecoration } from '@casehubio/graph-core';
import type { NodeLayout, ElkLayoutResult } from './layout/elk-layout.js';

describe('toReactFlowNode', () => {
  const parentIds = new Set<string>();

  it('maps id, type, and parentId directly', () => {
    const node: GraphNode = {
      id: 'n1', type: 'binding', parentId: 'w1',
      properties: { label: 'test' },
    };
    const result = toReactFlowNode(node, parentIds);
    expect(result.id).toBe('n1');
    expect(result.type).toBe('binding');
    expect(result.parentId).toBe('w1');
  });

  it('maps properties to data', () => {
    const node: GraphNode = {
      id: 'n1', type: 'binding',
      properties: { label: 'test', count: 42 },
    };
    const result = toReactFlowNode(node, parentIds);
    expect(result.data).toEqual({ label: 'test', count: 42 });
  });

  it('sets position to {0, 0}', () => {
    const node: GraphNode = {
      id: 'n1', type: 'binding', properties: {},
    };
    const result = toReactFlowNode(node, parentIds);
    expect(result.position).toEqual({ x: 0, y: 0 });
  });

  it('sets default dimensions on parent nodes', () => {
    const parents = new Set(['w1']);
    const node: GraphNode = {
      id: 'w1', type: 'worker', properties: {},
    };
    const result = toReactFlowNode(node, parents);
    expect(result.style).toEqual(
      expect.objectContaining({ width: 280, height: 180 }),
    );
  });

  it('does not set dimensions on non-parent nodes', () => {
    const node: GraphNode = {
      id: 'n1', type: 'binding', properties: {},
    };
    const result = toReactFlowNode(node, parentIds);
    expect(result.style).toBeUndefined();
  });

  it('omits parentId when not present', () => {
    const node: GraphNode = {
      id: 'n1', type: 'binding', properties: {},
    };
    const result = toReactFlowNode(node, parentIds);
    expect(result.parentId).toBeUndefined();
  });
});

describe('toReactFlowEdge', () => {
  it('maps id, source, target directly', () => {
    const edge: GraphEdge = {
      id: 'e1', type: 'default', source: 'n1', target: 'n2',
    };
    const result = toReactFlowEdge(edge);
    expect(result.id).toBe('e1');
    expect(result.source).toBe('n1');
    expect(result.target).toBe('n2');
  });

  it('maps type directly', () => {
    const edge: GraphEdge = {
      id: 'e1', type: 'capability', source: 'n1', target: 'n2',
    };
    const result = toReactFlowEdge(edge);
    expect(result.type).toBe('capability');
  });

  it('maps properties to data when present', () => {
    const edge: GraphEdge = {
      id: 'e1', type: 'default', source: 'n1', target: 'n2',
      properties: { weight: 5 },
    };
    const result = toReactFlowEdge(edge);
    expect(result.data).toEqual({ weight: 5 });
  });

  it('sets data to undefined when properties absent', () => {
    const edge: GraphEdge = {
      id: 'e1', type: 'default', source: 'n1', target: 'n2',
    };
    const result = toReactFlowEdge(edge);
    expect(result.data).toBeUndefined();
  });
});

describe('toReactFlowGraph', () => {
  it('converts a full model', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'w1', type: 'worker', properties: { label: 'Worker' } },
        { id: 'b1', type: 'binding', parentId: 'w1', properties: { label: 'Binding' } },
      ],
      edges: [
        { id: 'e1', type: 'default', source: 'b1', target: 'w1' },
      ],
    };
    const result = toReactFlowGraph(model);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    const w1 = result.nodes.find(n => n.id === 'w1');
    expect(w1?.style).toEqual(expect.objectContaining({ width: 280 }));
    const b1 = result.nodes.find(n => n.id === 'b1');
    expect(b1?.style).toBeUndefined();
  });

  it('returns empty arrays for empty model', () => {
    const model: GraphModel = { nodes: [], edges: [] };
    const result = toReactFlowGraph(model);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});

describe('toReactFlowNode with layout', () => {
  it('applies position from NodeLayout', () => {
    const node: GraphNode = { id: 'n1', type: 'a', properties: {} };
    const layout: NodeLayout = { x: 100, y: 200, width: 172, height: 36 };
    const result = toReactFlowNode(node, new Set(), layout);
    expect(result.position).toEqual({ x: 100, y: 200 });
  });

  it('applies width/height to parent nodes from NodeLayout', () => {
    const node: GraphNode = { id: 'p1', type: 'group', properties: {} };
    const layout: NodeLayout = { x: 50, y: 60, width: 400, height: 300 };
    const result = toReactFlowNode(node, new Set(['p1']), layout);
    expect(result.style).toEqual(expect.objectContaining({ width: 400, height: 300 }));
  });

  it('does not apply width/height to non-parent nodes', () => {
    const node: GraphNode = { id: 'n1', type: 'a', properties: {} };
    const layout: NodeLayout = { x: 10, y: 20, width: 172, height: 36 };
    const result = toReactFlowNode(node, new Set(), layout);
    expect(result.style).toBeUndefined();
  });
});

describe('toReactFlowGraph with layout', () => {
  it('applies layout positions and container sizes', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'w1', type: 'group', properties: {} },
        { id: 'b1', type: 'a', parentId: 'w1', properties: {} },
      ],
      edges: [],
    };
    const layout: ElkLayoutResult = {
      nodeLayouts: new Map([
        ['w1', { x: 0, y: 0, width: 400, height: 300 }],
        ['b1', { x: 20, y: 20, width: 172, height: 36 }],
      ]),
    };
    const result = toReactFlowGraph(model, layout);
    const w1 = result.nodes.find(n => n.id === 'w1')!;
    const b1 = result.nodes.find(n => n.id === 'b1')!;
    expect(w1.position).toEqual({ x: 0, y: 0 });
    expect(w1.style).toEqual(expect.objectContaining({ width: 400, height: 300 }));
    expect(b1.position).toEqual({ x: 20, y: 20 });
    expect(b1.style).toBeUndefined();
  });

  it('falls back to defaults when layout is absent', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'w1', type: 'group', properties: {} },
        { id: 'b1', type: 'a', parentId: 'w1', properties: {} },
      ],
      edges: [],
    };
    const result = toReactFlowGraph(model);
    const w1 = result.nodes.find(n => n.id === 'w1')!;
    const b1 = result.nodes.find(n => n.id === 'b1')!;
    expect(b1.position).toEqual({ x: 0, y: 0 });
    expect(w1.style).toEqual(expect.objectContaining({ width: 280, height: 180 }));
  });

  it('falls back to {0,0} for nodes missing from layout map', () => {
    const model: GraphModel = {
      nodes: [{ id: 'n1', type: 'a', properties: {} }],
      edges: [],
    };
    const layout: ElkLayoutResult = { nodeLayouts: new Map() };
    const result = toReactFlowGraph(model, layout);
    expect(result.nodes[0]!.position).toEqual({ x: 0, y: 0 });
  });
});

describe('toReactFlowNode with decoration', () => {
  const parentIds = new Set<string>();

  it('merges decoration into data under _decoration key', () => {
    const node: GraphNode = { id: 'n1', type: 'binding', properties: { label: 'test' } };
    const decoration: NodeDecoration = { badge: { icon: 'play', color: 'green', pulse: true } };
    const result = toReactFlowNode(node, parentIds, undefined, decoration);
    expect(result.data).toEqual({ label: 'test', _decoration: decoration });
  });

  it('omits _decoration key when no decoration provided', () => {
    const node: GraphNode = { id: 'n1', type: 'binding', properties: { label: 'test' } };
    const result = toReactFlowNode(node, parentIds);
    expect(result.data).toEqual({ label: 'test' });
    expect('_decoration' in (result.data)).toBe(false);
  });

  it('omits _decoration key when decoration is undefined', () => {
    const node: GraphNode = { id: 'n1', type: 'binding', properties: {} };
    const result = toReactFlowNode(node, parentIds, undefined, undefined);
    expect('_decoration' in (result.data)).toBe(false);
  });
});

describe('toReactFlowGraph with decorations', () => {
  it('applies decorations to matching nodes', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'n1', type: 'a', properties: {} },
        { id: 'n2', type: 'b', properties: {} },
      ],
      edges: [],
    };
    const decorations = new Map<string, NodeDecoration>([
      ['n1', { badge: { icon: 'check', color: 'green' } }],
    ]);
    const result = toReactFlowGraph(model, undefined, decorations);
    const n1 = result.nodes.find(n => n.id === 'n1')!;
    const n2 = result.nodes.find(n => n.id === 'n2')!;
    expect((n1.data)._decoration).toEqual({ badge: { icon: 'check', color: 'green' } });
    expect('_decoration' in (n2.data)).toBe(false);
  });

  it('works with no decorations map', () => {
    const model: GraphModel = {
      nodes: [{ id: 'n1', type: 'a', properties: {} }],
      edges: [],
    };
    const result = toReactFlowGraph(model);
    expect('_decoration' in (result.nodes[0]!.data)).toBe(false);
  });

  it('works with empty decorations map', () => {
    const model: GraphModel = {
      nodes: [{ id: 'n1', type: 'a', properties: {} }],
      edges: [],
    };
    const result = toReactFlowGraph(model, undefined, new Map());
    expect('_decoration' in (result.nodes[0]!.data)).toBe(false);
  });
});

describe('toReactFlowGraph with isDrillable', () => {
  it('injects _drillable: true when isDrillable returns true', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'n1', type: 'a', properties: { label: 'A' } },
        { id: 'n2', type: 'b', properties: { label: 'B' } },
      ],
      edges: [],
    };
    const isDrillable = (nodeId: string) => nodeId === 'n1';
    const result = toReactFlowGraph(model, undefined, undefined, undefined, isDrillable);
    expect(result.nodes[0]!.data._drillable).toBe(true);
    expect('_drillable' in result.nodes[1]!.data).toBe(false);
  });

  it('does not inject _drillable when no predicate provided', () => {
    const model: GraphModel = {
      nodes: [{ id: 'n1', type: 'a', properties: {} }],
      edges: [],
    };
    const result = toReactFlowGraph(model);
    expect('_drillable' in result.nodes[0]!.data).toBe(false);
  });

  it('model-aware isDrillable re-injects _drillable after model swap (drill-down round-trip)', () => {
    const rootModel: GraphModel = {
      nodes: [
        { id: 'ingest', type: 'source', properties: {} },
        { id: 'export', type: 'sink', properties: {} },
      ],
      edges: [],
    };
    const subModel: GraphModel = {
      nodes: [
        { id: 'fetch', type: 'source', properties: {} },
        { id: 'parse', type: 'transform', properties: {} },
      ],
      edges: [],
    };

    const drillableByModel = new Map<GraphModel, Set<string>>();
    drillableByModel.set(rootModel, new Set(['ingest']));
    drillableByModel.set(subModel, new Set([]));

    const isDrillable = (nodeId: string, model: GraphModel) =>
      drillableByModel.get(model)?.has(nodeId) ?? false;

    // Initial render — ingest is drillable
    const r1 = toReactFlowGraph(rootModel, undefined, undefined, undefined, isDrillable);
    expect(r1.nodes[0]!.data._drillable).toBe(true);

    // Drill down — sub-model has no drillable nodes
    const r2 = toReactFlowGraph(subModel, undefined, undefined, undefined, isDrillable);
    expect('_drillable' in r2.nodes[0]!.data).toBe(false);

    // Navigate back — root model should have ingest drillable again
    const r3 = toReactFlowGraph(rootModel, undefined, undefined, undefined, isDrillable);
    expect(r3.nodes[0]!.data._drillable).toBe(true);
  });
});
