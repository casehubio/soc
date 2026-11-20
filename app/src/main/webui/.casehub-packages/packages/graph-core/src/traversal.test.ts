import { describe, it, expect } from 'vitest';
import { childrenOf, ancestorsOf, subtreeOf, rootNodes } from './traversal.js';
import type { GraphModel, GraphNode } from './model.js';

function node(id: string, type = 'default', parentId?: string): GraphNode {
  const base = { id, type, properties: {} };
  return parentId !== undefined ? { ...base, parentId } : base;
}

function model(nodes: GraphNode[]): GraphModel {
  return { nodes, edges: [] };
}

describe('childrenOf', () => {
  it('returns direct children', () => {
    const m = model([node('a'), node('b', 'x', 'a'), node('c', 'x', 'a')]);
    expect(childrenOf(m, 'a').map(n => n.id)).toEqual(['b', 'c']);
  });

  it('returns empty array when no children', () => {
    expect(childrenOf(model([node('a')]), 'a')).toEqual([]);
  });

  it('returns empty array for non-existent parent', () => {
    expect(childrenOf(model([node('a')]), 'missing')).toEqual([]);
  });

  it('does not return grandchildren', () => {
    const m = model([node('a'), node('b', 'x', 'a'), node('c', 'x', 'b')]);
    expect(childrenOf(m, 'a').map(n => n.id)).toEqual(['b']);
  });
});

describe('ancestorsOf', () => {
  it('returns parent chain nearest-first', () => {
    const m = model([node('root'), node('mid', 'x', 'root'), node('leaf', 'x', 'mid')]);
    expect(ancestorsOf(m, 'leaf').map(n => n.id)).toEqual(['mid', 'root']);
  });

  it('returns empty for root node', () => {
    expect(ancestorsOf(model([node('a')]), 'a')).toEqual([]);
  });

  it('returns empty for non-existent node', () => {
    expect(ancestorsOf(model([node('a')]), 'missing')).toEqual([]);
  });

  it('throws on containment cycle', () => {
    const m: GraphModel = {
      nodes: [
        { id: 'a', type: 'x', parentId: 'b', properties: {} },
        { id: 'b', type: 'x', parentId: 'a', properties: {} },
      ],
      edges: [],
    };
    expect(() => ancestorsOf(m, 'a')).toThrow(/cycle/i);
  });

  it('throws on self-referencing parentId', () => {
    const m: GraphModel = {
      nodes: [{ id: 'a', type: 'x', parentId: 'a', properties: {} }],
      edges: [],
    };
    expect(() => ancestorsOf(m, 'a')).toThrow(/cycle/i);
  });
});

describe('subtreeOf', () => {
  it('returns node itself plus all descendants', () => {
    const m = model([node('a'), node('b', 'x', 'a'), node('c', 'x', 'b')]);
    expect(subtreeOf(m, 'a').map(n => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns breadth-first order', () => {
    const m = model([
      node('root'),
      node('l1a', 'x', 'root'),
      node('l1b', 'x', 'root'),
      node('l2a', 'x', 'l1a'),
      node('l2b', 'x', 'l1b'),
    ]);
    const ids = subtreeOf(m, 'root').map(n => n.id);
    expect(ids[0]).toBe('root');
    expect(ids.indexOf('l1a')).toBeLessThan(ids.indexOf('l2a'));
    expect(ids.indexOf('l1b')).toBeLessThan(ids.indexOf('l2b'));
  });

  it('returns just the node when it has no children', () => {
    expect(subtreeOf(model([node('a')]), 'a').map(n => n.id)).toEqual(['a']);
  });

  it('returns empty for non-existent node', () => {
    expect(subtreeOf(model([node('a')]), 'missing')).toEqual([]);
  });

  it('throws on containment cycle', () => {
    const m: GraphModel = {
      nodes: [
        { id: 'a', type: 'x', parentId: 'b', properties: {} },
        { id: 'b', type: 'x', parentId: 'a', properties: {} },
      ],
      edges: [],
    };
    expect(() => subtreeOf(m, 'a')).toThrow(/cycle/i);
  });
});

describe('rootNodes', () => {
  it('returns nodes with no parentId', () => {
    const m = model([node('a'), node('b', 'x', 'a'), node('c')]);
    expect(rootNodes(m).map(n => n.id)).toEqual(['a', 'c']);
  });

  it('returns all nodes when none have parents', () => {
    const m = model([node('a'), node('b')]);
    expect(rootNodes(m)).toHaveLength(2);
  });

  it('returns empty when all nodes have parents', () => {
    const m = model([node('a', 'x', 'b'), node('b', 'x', 'a')]);
    expect(rootNodes(m)).toEqual([]);
  });

  it('returns empty for empty model', () => {
    expect(rootNodes(model([]))).toEqual([]);
  });
});
