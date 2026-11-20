import { describe, it, expect } from 'vitest';
import { edgesOf, inboundEdges, outboundEdges, nodeById, edgeById } from './query.js';
import type { GraphModel, GraphNode, GraphEdge } from './model.js';

function node(id: string, type = 'default'): GraphNode {
  return { id, type, properties: {} };
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target };
}

function model(nodes: GraphNode[], edges: GraphEdge[]): GraphModel {
  return { nodes, edges };
}

describe('edgesOf', () => {
  it('returns all edges connected to a node', () => {
    const m = model(
      [node('a'), node('b'), node('c')],
      [edge('e1', 'a', 'b'), edge('e2', 'c', 'a'), edge('e3', 'b', 'c')],
    );
    const ids = edgesOf(m, 'a').map(e => e.id);
    expect(ids).toContain('e1');
    expect(ids).toContain('e2');
    expect(ids).not.toContain('e3');
  });

  it('returns empty array for node with no edges', () => {
    expect(edgesOf(model([node('a')], []), 'a')).toEqual([]);
  });

  it('returns self-loop edge once', () => {
    const m = model([node('a')], [edge('e1', 'a', 'a')]);
    expect(edgesOf(m, 'a')).toHaveLength(1);
  });

  it('returns empty for empty model', () => {
    expect(edgesOf(model([], []), 'a')).toEqual([]);
  });
});

describe('inboundEdges', () => {
  it('returns edges targeting the node', () => {
    const m = model(
      [node('a'), node('b')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
    );
    expect(inboundEdges(m, 'a').map(e => e.id)).toEqual(['e2']);
  });

  it('includes self-loop', () => {
    const m = model([node('a')], [edge('e1', 'a', 'a')]);
    expect(inboundEdges(m, 'a')).toHaveLength(1);
  });
});

describe('outboundEdges', () => {
  it('returns edges sourced from the node', () => {
    const m = model(
      [node('a'), node('b')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
    );
    expect(outboundEdges(m, 'a').map(e => e.id)).toEqual(['e1']);
  });

  it('includes self-loop', () => {
    const m = model([node('a')], [edge('e1', 'a', 'a')]);
    expect(outboundEdges(m, 'a')).toHaveLength(1);
  });
});

describe('nodeById', () => {
  it('finds a node by ID', () => {
    const m = model([node('a'), node('b')], []);
    expect(nodeById(m, 'b')?.id).toBe('b');
  });

  it('returns undefined for non-existent ID', () => {
    expect(nodeById(model([node('a')], []), 'missing')).toBeUndefined();
  });

  it('returns undefined for empty model', () => {
    expect(nodeById(model([], []), 'a')).toBeUndefined();
  });
});

describe('edgeById', () => {
  it('finds an edge by ID', () => {
    const m = model([node('a'), node('b')], [edge('e1', 'a', 'b')]);
    expect(edgeById(m, 'e1')?.id).toBe('e1');
  });

  it('returns undefined for non-existent ID', () => {
    expect(edgeById(model([], []), 'missing')).toBeUndefined();
  });
});
