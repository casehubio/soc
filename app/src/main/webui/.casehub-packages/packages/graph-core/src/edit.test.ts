import { describe, it, expect, beforeEach } from 'vitest';
import { addNode, removeNode, removeNodes, replaceNode, addEdge, removeEdge, reconnectEdge, splitEdge } from './edit.js';
import { createGraph } from './graph.js';
import { registerGrammar, clearGrammarRegistry } from './grammar.js';
import type { GraphNode, GraphEdge } from './model.js';

function node(id: string, type: string, parentId?: string): GraphNode {
  const base = { id, type, properties: {} };
  return parentId !== undefined ? { ...base, parentId } : base;
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target };
}

describe('addNode', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('adds a node to an empty graph', () => {
    const model = createGraph([], []);
    const result = addNode(model, node('a', 'binding'));
    expect(result.model.nodes).toHaveLength(1);
    expect(result.model.nodes[0]!.id).toBe('a');
  });

  it('adds a node to an existing graph', () => {
    const model = createGraph([node('a', 'binding')], []);
    const result = addNode(model, node('b', 'worker'));
    expect(result.model.nodes).toHaveLength(2);
  });

  it('adds a node with containment', () => {
    const model = createGraph([node('w1', 'worker')], []);
    const result = addNode(model, node('c1', 'capability', 'w1'));
    expect(result.model.nodes).toHaveLength(2);
    expect(result.model.nodes[1]!.parentId).toBe('w1');
  });

  it('produces a new model instance', () => {
    const model = createGraph([node('a', 'binding')], []);
    const result = addNode(model, node('b', 'worker'));
    expect(result.model).not.toBe(model);
    expect(model.nodes).toHaveLength(1);
  });

  it('preserves existing edges', () => {
    const model = createGraph(
      [node('a', 'binding'), node('b', 'worker')],
      [edge('e1', 'a', 'b')],
    );
    const result = addNode(model, node('c', 'worker'));
    expect(result.model.edges).toHaveLength(1);
  });

  it('reports constraint violations without blocking', () => {
    registerGrammar({
      type: 'capability',
      connections: {
        inbound: { min: 0, max: 0, allowedFrom: [] },
        outbound: { min: 0, max: 0, allowedTo: [] },
      },
      containment: { allowedParentTypes: ['worker'] },
    });
    const model = createGraph([node('b1', 'binding')], []);
    const result = addNode(model, node('c1', 'capability', 'b1'));
    expect(result.model.nodes).toHaveLength(2);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('throws on duplicate node ID', () => {
    const model = createGraph([node('a', 'binding')], []);
    expect(() => addNode(model, node('a', 'worker'))).toThrow(/duplicate/i);
  });
});

describe('removeNode', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('removes a node from the graph', () => {
    const model = createGraph(
      [node('a', 'binding'), node('b', 'worker')],
      [],
    );
    const result = removeNode(model, 'a');
    expect(result.model.nodes).toHaveLength(1);
    expect(result.model.nodes[0]!.id).toBe('b');
  });

  it('removes associated edges', () => {
    const model = createGraph(
      [node('a', 'binding'), node('b', 'worker'), node('c', 'worker')],
      [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'c')],
    );
    const result = removeNode(model, 'a');
    expect(result.model.edges).toHaveLength(1);
    expect(result.model.edges[0]!.id).toBe('e3');
  });

  it('produces a new model instance', () => {
    const model = createGraph([node('a', 'binding'), node('b', 'worker')], []);
    const result = removeNode(model, 'a');
    expect(result.model).not.toBe(model);
    expect(model.nodes).toHaveLength(2);
  });

  it('removes children when parent is removed', () => {
    const model = createGraph(
      [node('w1', 'worker'), node('c1', 'cap', 'w1'), node('c2', 'cap', 'w1')],
      [],
    );
    const result = removeNode(model, 'w1');
    expect(result.model.nodes).toHaveLength(0);
  });

  it('throws when node does not exist', () => {
    const model = createGraph([node('a', 'binding')], []);
    expect(() => removeNode(model, 'missing')).toThrow(/not found/i);
  });
});

describe('replaceNode', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('replaces a node preserving its ID', () => {
    const model = createGraph([node('a', 'binding')], []);
    const replacement = node('a', 'worker');
    const result = replaceNode(model, 'a', replacement);
    expect(result.model.nodes).toHaveLength(1);
    expect(result.model.nodes[0]!.type).toBe('worker');
  });

  it('preserves edges connected to the node', () => {
    const model = createGraph(
      [node('a', 'binding'), node('b', 'worker')],
      [edge('e1', 'a', 'b')],
    );
    const replacement = node('a', 'goal');
    const result = replaceNode(model, 'a', replacement);
    expect(result.model.edges).toHaveLength(1);
  });

  it('produces a new model instance', () => {
    const model = createGraph([node('a', 'binding')], []);
    const result = replaceNode(model, 'a', node('a', 'worker'));
    expect(result.model).not.toBe(model);
  });

  it('reports violations when replacement breaks grammar rules', () => {
    registerGrammar({
      type: 'goal',
      connections: {
        inbound: { min: 0, max: 0, allowedFrom: [] },
        outbound: { min: 0, max: 0, allowedTo: [] },
      },
    });
    registerGrammar({
      type: 'binding',
      connections: {
        inbound: { min: 0, max: 0, allowedFrom: [] },
        outbound: { min: 0, max: 1, allowedTo: ['worker'] },
      },
    });
    const model = createGraph(
      [node('a', 'binding'), node('b', 'worker')],
      [edge('e1', 'a', 'b')],
    );
    const result = replaceNode(model, 'a', node('a', 'goal'));
    expect(result.model.nodes[0]!.type).toBe('goal');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('throws when target node does not exist', () => {
    const model = createGraph([node('a', 'binding')], []);
    expect(() => replaceNode(model, 'missing', node('missing', 'worker'))).toThrow(/not found/i);
  });

  it('throws when replacement ID does not match target', () => {
    const model = createGraph([node('a', 'binding')], []);
    expect(() => replaceNode(model, 'a', node('b', 'worker'))).toThrow(/must match/i);
  });
});

describe('addEdge', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('adds an edge to a graph', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [],
    );
    const result = addEdge(model, edge('e1', 'n1', 'n2'));
    expect(result.model.edges).toHaveLength(1);
    expect(result.model.edges[0]!.id).toBe('e1');
  });

  it('produces a new model instance', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [],
    );
    const result = addEdge(model, edge('e1', 'n1', 'n2'));
    expect(result.model).not.toBe(model);
    expect(model.edges).toHaveLength(0);
  });

  it('throws on duplicate edge ID', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => addEdge(model, edge('e1', 'n1', 'n2'))).toThrow(/duplicate/i);
  });

  it('throws when source node does not exist', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [],
    );
    expect(() => addEdge(model, edge('e1', 'missing', 'n2'))).toThrow(/source.*not found/i);
  });

  it('throws when target node does not exist', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [],
    );
    expect(() => addEdge(model, edge('e1', 'n1', 'missing'))).toThrow(/target.*not found/i);
  });

  it('returns constraint violations when grammar is registered', () => {
    registerGrammar({
      type: 'source',
      connections: {
        inbound: { min: 0, max: 0, allowedFrom: [] },
        outbound: { min: 0, max: 0, allowedTo: [] },
      },
    });
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [],
    );
    const result = addEdge(model, edge('e1', 'n1', 'n2'));
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

describe('removeEdge', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('removes an edge from the graph', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [edge('e1', 'n1', 'n2')],
    );
    const result = removeEdge(model, 'e1');
    expect(result.model.edges).toHaveLength(0);
    expect(result.model.nodes).toHaveLength(2);
  });

  it('produces a new model instance', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [edge('e1', 'n1', 'n2')],
    );
    const result = removeEdge(model, 'e1');
    expect(result.model).not.toBe(model);
    expect(model.edges).toHaveLength(1);
  });

  it('throws when edge not found', () => {
    const model = createGraph(
      [node('n1', 'source'), node('n2', 'target')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => removeEdge(model, 'missing')).toThrow(/not found/i);
  });
});

describe('reconnectEdge', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('changes the target of an existing edge', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b'), node('n3', 'c')],
      [edge('e1', 'n1', 'n2')],
    );
    const result = reconnectEdge(model, 'e1', { target: 'n3' });
    expect(result.model.edges).toHaveLength(1);
    expect(result.model.edges[0]!.target).toBe('n3');
    expect(result.model.edges[0]!.source).toBe('n1');
    expect(result.model.edges[0]!.id).toBe('e1');
  });

  it('changes the source of an existing edge', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b'), node('n3', 'c')],
      [edge('e1', 'n1', 'n2')],
    );
    const result = reconnectEdge(model, 'e1', { source: 'n3' });
    expect(result.model.edges).toHaveLength(1);
    expect(result.model.edges[0]!.source).toBe('n3');
    expect(result.model.edges[0]!.target).toBe('n2');
    expect(result.model.edges[0]!.id).toBe('e1');
  });

  it('changes both endpoints', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b'), node('n3', 'c')],
      [edge('e1', 'n1', 'n2')],
    );
    const result = reconnectEdge(model, 'e1', { source: 'n3', target: 'n3' });
    expect(result.model.edges[0]!.source).toBe('n3');
    expect(result.model.edges[0]!.target).toBe('n3');
  });

  it('throws when edge not found', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b'), node('n3', 'c')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => reconnectEdge(model, 'missing', { target: 'n3' })).toThrow(/not found/i);
  });

  it('throws when new target not found', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => reconnectEdge(model, 'e1', { target: 'missing' })).toThrow(/not found/i);
  });

  it('throws when new source not found', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => reconnectEdge(model, 'e1', { source: 'missing' })).toThrow(/not found/i);
  });

  it('throws when no endpoints specified', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => reconnectEdge(model, 'e1', {})).toThrow(/at least one endpoint/i);
  });
});

describe('splitEdge', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('removes original edge, adds node, adds two new edges', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b')],
      [edge('e1', 'n1', 'n2')],
    );
    const insertNode = node('n3', 'c');
    const result = splitEdge(model, 'e1', insertNode);
    expect(result.model.nodes).toHaveLength(3);
    expect(result.model.nodes.find(n => n.id === 'n3')).toBeDefined();
    expect(result.model.edges).toHaveLength(2);
    expect(result.model.edges.find(e => e.source === 'n1' && e.target === 'n3')).toBeDefined();
    expect(result.model.edges.find(e => e.source === 'n3' && e.target === 'n2')).toBeDefined();
    expect(result.model.edges.find(e => e.id === 'e1')).toBeUndefined();
  });

  it('throws when edge not found', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => splitEdge(model, 'missing', node('n3', 'c'))).toThrow(/not found/i);
  });

  it('throws when insert node has duplicate ID', () => {
    const model = createGraph(
      [node('n1', 'a'), node('n2', 'b')],
      [edge('e1', 'n1', 'n2')],
    );
    expect(() => splitEdge(model, 'e1', node('n1', 'c'))).toThrow(/duplicate/i);
  });
});

describe('removeNodes', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('removes multiple nodes and their edges', () => {
    const model = createGraph(
      [node('A', 'step'), node('B', 'step'), node('C', 'step'), node('D', 'step')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D')],
    );
    const result = removeNodes(model, new Set(['B', 'C']));
    expect(result.model.nodes).toHaveLength(2);
    expect(result.model.nodes.map(n => n.id).sort()).toEqual(['A', 'D']);
    expect(result.model.edges).toHaveLength(0);
  });

  it('handles empty set — returns same model', () => {
    const model = createGraph([node('A', 'step')], []);
    const result = removeNodes(model, new Set());
    expect(result.model.nodes).toHaveLength(1);
  });

  it('removes leaf nodes before parents in containment tree', () => {
    const P: GraphNode = { id: 'P', type: 'container', properties: {} };
    const Ch: GraphNode = { id: 'Ch', type: 'step', parentId: 'P', properties: {} };
    const model = createGraph([P, Ch], []);
    const result = removeNodes(model, new Set(['P', 'Ch']));
    expect(result.model.nodes).toHaveLength(0);
  });

  it('removes a single node', () => {
    const model = createGraph(
      [node('A', 'step'), node('B', 'step')],
      [edge('e1', 'A', 'B')],
    );
    const result = removeNodes(model, new Set(['B']));
    expect(result.model.nodes).toHaveLength(1);
    expect(result.model.edges).toHaveLength(0);
  });
});
