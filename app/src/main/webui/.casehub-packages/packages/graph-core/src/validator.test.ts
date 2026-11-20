import { describe, it, expect, beforeEach } from 'vitest';
import { validateConstraints } from './validator.js';
import type { ConstraintViolation } from './validator.js';
import { registerGrammar, clearGrammarRegistry } from './grammar.js';
import type { StencilGrammar } from './grammar.js';
import { createGraph } from './graph.js';
import type { GraphNode, GraphEdge } from './model.js';

function node(id: string, type: string, parentId?: string): GraphNode {
  const base = { id, type, properties: {} };
  return parentId !== undefined ? { ...base, parentId } : base;
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target };
}

function bindingGrammar(): StencilGrammar {
  return {
    type: 'binding',
    connections: {
      inbound: { min: 0, max: 0, allowedFrom: [] },
      outbound: { min: 0, max: 1, allowedTo: ['worker'] },
    },
  };
}

function workerGrammar(): StencilGrammar {
  return {
    type: 'worker',
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
      outbound: { min: 0, max: 0, allowedTo: [] },
    },
  };
}

describe('validateConstraints', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('returns empty for a valid graph', () => {
    registerGrammar(bindingGrammar());
    registerGrammar(workerGrammar());
    const model = createGraph(
      [node('b1', 'binding'), node('w1', 'worker')],
      [edge('e1', 'b1', 'w1')],
    );
    expect(validateConstraints(model)).toEqual([]);
  });

  it('returns empty when no grammars are registered', () => {
    const model = createGraph(
      [node('a', 'unknown'), node('b', 'unknown')],
      [edge('e1', 'a', 'b')],
    );
    expect(validateConstraints(model)).toEqual([]);
  });

  it('skips nodes whose type has no registered grammar', () => {
    registerGrammar(bindingGrammar());
    const model = createGraph(
      [node('b1', 'binding'), node('x1', 'unregistered')],
      [edge('e1', 'b1', 'x1')],
    );
    const violations = validateConstraints(model);
    const outboundTypeViolation = violations.find(
      v => v.rule === 'outbound_type' && v.nodeId === 'b1',
    );
    expect(outboundTypeViolation).toBeDefined();
  });

  describe('edge count validation', () => {
    it('reports too many outbound edges', () => {
      registerGrammar(bindingGrammar());
      registerGrammar(workerGrammar());
      const model = createGraph(
        [node('b1', 'binding'), node('w1', 'worker'), node('w2', 'worker')],
        [edge('e1', 'b1', 'w1'), edge('e2', 'b1', 'w2')],
      );
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'outbound_count' && v.nodeId === 'b1')).toBe(true);
    });

    it('reports too few inbound edges', () => {
      const g: StencilGrammar = {
        type: 'sink',
        connections: {
          inbound: { min: 1, max: Infinity, allowedFrom: [] },
          outbound: { min: 0, max: 0, allowedTo: [] },
        },
      };
      registerGrammar(g);
      const model = createGraph([node('s1', 'sink')], []);
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'inbound_count' && v.nodeId === 's1')).toBe(true);
    });

    it('reports inbound edges when max is 0', () => {
      registerGrammar(bindingGrammar());
      registerGrammar(workerGrammar());
      const model = createGraph(
        [node('b1', 'binding'), node('w1', 'worker')],
        [edge('e1', 'w1', 'b1')],
      );
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'inbound_count' && v.nodeId === 'b1')).toBe(true);
    });
  });

  describe('edge type validation', () => {
    it('reports outbound edge to disallowed target type', () => {
      registerGrammar(bindingGrammar());
      registerGrammar({
        type: 'milestone',
        connections: {
          inbound: { min: 0, max: Infinity, allowedFrom: [] },
          outbound: { min: 0, max: 0, allowedTo: [] },
        },
      });
      const model = createGraph(
        [node('b1', 'binding'), node('m1', 'milestone')],
        [edge('e1', 'b1', 'm1')],
      );
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'outbound_type' && v.nodeId === 'b1')).toBe(true);
    });

    it('reports inbound edge from disallowed source type', () => {
      registerGrammar(workerGrammar());
      registerGrammar({
        type: 'goal',
        connections: {
          inbound: { min: 0, max: Infinity, allowedFrom: [] },
          outbound: { min: 0, max: 1, allowedTo: ['worker'] },
        },
      });
      const model = createGraph(
        [node('g1', 'goal'), node('w1', 'worker')],
        [edge('e1', 'g1', 'w1')],
      );
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'inbound_type' && v.nodeId === 'w1')).toBe(true);
    });

    it('skips type validation when allowedFrom/allowedTo is empty', () => {
      registerGrammar({
        type: 'open',
        connections: {
          inbound: { min: 0, max: Infinity, allowedFrom: [] },
          outbound: { min: 0, max: Infinity, allowedTo: [] },
        },
      });
      const model = createGraph(
        [node('a', 'open'), node('b', 'open')],
        [edge('e1', 'a', 'b')],
      );
      expect(validateConstraints(model)).toEqual([]);
    });
  });

  describe('containment validation', () => {
    it('reports node in disallowed parent type', () => {
      registerGrammar({
        type: 'capability',
        connections: {
          inbound: { min: 0, max: 0, allowedFrom: [] },
          outbound: { min: 0, max: 0, allowedTo: [] },
        },
        containment: { allowedParentTypes: ['worker'] },
      });
      registerGrammar(workerGrammar());
      registerGrammar(bindingGrammar());
      const model = createGraph(
        [node('b1', 'binding'), node('c1', 'capability', 'b1')],
        [],
      );
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'parent_type' && v.nodeId === 'c1')).toBe(true);
    });

    it('passes when node is in allowed parent type', () => {
      registerGrammar({
        type: 'capability',
        connections: {
          inbound: { min: 0, max: 0, allowedFrom: [] },
          outbound: { min: 0, max: 0, allowedTo: [] },
        },
        containment: { allowedParentTypes: ['worker'] },
      });
      registerGrammar(workerGrammar());
      const model = createGraph(
        [node('w1', 'worker'), node('c1', 'capability', 'w1')],
        [],
      );
      expect(validateConstraints(model)).toEqual([]);
    });

    it('reports root node when allowedParentTypes is set', () => {
      registerGrammar({
        type: 'capability',
        connections: {
          inbound: { min: 0, max: 0, allowedFrom: [] },
          outbound: { min: 0, max: 0, allowedTo: [] },
        },
        containment: { allowedParentTypes: ['worker'] },
      });
      const model = createGraph([node('c1', 'capability')], []);
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'parent_type' && v.nodeId === 'c1')).toBe(true);
    });

    it('reports child of disallowed type', () => {
      registerGrammar({
        type: 'worker',
        connections: {
          inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
          outbound: { min: 0, max: 0, allowedTo: [] },
        },
        containment: { allowedChildTypes: ['capability'] },
      });
      registerGrammar(bindingGrammar());
      const model = createGraph(
        [node('w1', 'worker'), node('b1', 'binding', 'w1')],
        [],
      );
      const violations = validateConstraints(model);
      expect(violations.some(v => v.rule === 'child_type' && v.nodeId === 'w1')).toBe(true);
    });
  });

  describe('multiple violations', () => {
    it('collects all violations across nodes', () => {
      registerGrammar(bindingGrammar());
      registerGrammar(workerGrammar());
      const model = createGraph(
        [node('b1', 'binding'), node('b2', 'binding'), node('w1', 'worker')],
        [edge('e1', 'b1', 'w1'), edge('e2', 'b1', 'w1'), edge('e3', 'b2', 'w1'), edge('e4', 'b2', 'w1')],
      );
      const violations = validateConstraints(model);
      expect(violations.length).toBeGreaterThanOrEqual(2);
    });

    it('violations include human-readable messages', () => {
      registerGrammar(bindingGrammar());
      registerGrammar(workerGrammar());
      const model = createGraph(
        [node('b1', 'binding'), node('w1', 'worker'), node('w2', 'worker')],
        [edge('e1', 'b1', 'w1'), edge('e2', 'b1', 'w2')],
      );
      const violations = validateConstraints(model);
      expect(violations.every((v: ConstraintViolation) => v.message.length > 0)).toBe(true);
    });
  });
});
