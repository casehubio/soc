import { describe, it, expect } from 'vitest';
import { createGraph, validateGraph, GraphValidationError } from './graph.js';
import type { GraphNode, GraphEdge, GraphViolation } from './index.js';

function node(id: string, type = 'default', parentId?: string): GraphNode {
  const base = { id, type, properties: {} };
  return parentId !== undefined ? { ...base, parentId } : base;
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target };
}

describe('createGraph', () => {
  it('creates a model from valid nodes and edges', () => {
    const n = [node('a', 'x'), node('b', 'y')];
    const e = [edge('e1', 'a', 'b')];
    const model = createGraph(n, e, { name: 'test' });

    expect(model.nodes).toEqual(n);
    expect(model.edges).toEqual(e);
    expect(model.metadata).toEqual({ name: 'test' });
  });

  it('creates an empty model', () => {
    const model = createGraph([], []);
    expect(model.nodes).toEqual([]);
    expect(model.edges).toEqual([]);
  });

  it('creates a single-node model with no edges', () => {
    const model = createGraph([node('a')], []);
    expect(model.nodes).toHaveLength(1);
    expect(model.edges).toHaveLength(0);
  });

  it('accepts self-loop edges', () => {
    const model = createGraph([node('a')], [edge('e1', 'a', 'a')]);
    expect(model.edges).toHaveLength(1);
  });

  it('rejects duplicate node IDs', () => {
    expect(() => createGraph([node('a'), node('a')], []))
      .toThrow(GraphValidationError);
  });

  it('rejects duplicate edge IDs', () => {
    const n = [node('a'), node('b')];
    expect(() => createGraph(n, [edge('e1', 'a', 'b'), edge('e1', 'b', 'a')]))
      .toThrow(GraphValidationError);
  });

  it('rejects dangling edge source', () => {
    expect(() => createGraph([node('a')], [edge('e1', 'missing', 'a')]))
      .toThrow(GraphValidationError);
  });

  it('rejects dangling edge target', () => {
    expect(() => createGraph([node('a')], [edge('e1', 'a', 'missing')]))
      .toThrow(GraphValidationError);
  });

  it('rejects invalid parentId', () => {
    expect(() => createGraph([node('a', 'x', 'missing')], []))
      .toThrow(GraphValidationError);
  });

  it('rejects self-referencing parentId', () => {
    expect(() => createGraph([node('a', 'x', 'a')], []))
      .toThrow(GraphValidationError);
  });

  it('rejects containment cycle', () => {
    const n: GraphNode[] = [
      { id: 'a', type: 'x', parentId: 'b', properties: {} },
      { id: 'b', type: 'x', parentId: 'a', properties: {} },
    ];
    expect(() => createGraph(n, [])).toThrow(GraphValidationError);
  });

  it('rejects empty node ID', () => {
    expect(() => createGraph([node('')], []))
      .toThrow(GraphValidationError);
  });

  it('rejects whitespace-only node ID', () => {
    expect(() => createGraph([node('  ')], []))
      .toThrow(GraphValidationError);
  });

  it('rejects empty edge ID', () => {
    const n = [node('a'), node('b')];
    expect(() => createGraph(n, [edge('', 'a', 'b')]))
      .toThrow(GraphValidationError);
  });

  it('collects multiple violations in single throw', () => {
    try {
      createGraph([node('a'), node('a'), node('')], []);
      expect.fail('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(GraphValidationError);
      const violations = (err as GraphValidationError).violations;
      expect(violations.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('provides structured violation data', () => {
    try {
      createGraph([node('a'), node('a')], []);
      expect.fail('should throw');
    } catch (err) {
      const v = (err as GraphValidationError).violations[0]!;
      expect(v.rule).toBe('duplicate_node_id');
      expect(v.message).toContain('a');
      expect(v.nodeId).toBe('a');
    }
  });
});

describe('validateGraph', () => {
  it('returns empty array for valid model', () => {
    const violations = validateGraph(
      [node('a'), node('b')],
      [edge('e1', 'a', 'b')],
    );
    expect(violations).toEqual([]);
  });

  it('returns all violations without throwing', () => {
    const violations = validateGraph(
      [node('a'), node('a'), node('')],
      [],
    );
    expect(violations.length).toBeGreaterThanOrEqual(2);
    expect(violations.every((v: GraphViolation) => v.rule && v.message)).toBe(true);
  });
});
