import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerGrammar, clearGrammarRegistry } from '@casehubio/graph-core';
import type { GraphModel, GraphNode } from '@casehubio/graph-core';
import { createCaseEditPolicy } from './case-edit-policy.js';
import { bindingGrammar } from '../stencils/binding.js';
import { workerGrammar } from '../stencils/worker.js';
import { milestoneGrammar } from '../stencils/milestone.js';
import { goalGrammar } from '../stencils/goal.js';
import { subcaseGrammar } from '../stencils/subcase.js';

function node(id: string, type: string, props: Record<string, unknown> = {}): GraphNode {
  return { id, type, properties: props };
}

function model(nodes: GraphNode[], edges: { id: string; source: string; target: string }[] = []): GraphModel {
  return {
    nodes,
    edges: edges.map(e => ({ ...e, type: 'default' })),
  };
}

describe('CaseEditPolicy', () => {
  const policy = createCaseEditPolicy();

  beforeAll(() => {
    registerGrammar(bindingGrammar);
    registerGrammar(workerGrammar);
    registerGrammar(milestoneGrammar);
    registerGrammar(goalGrammar);
    registerGrammar(subcaseGrammar);
  });

  afterAll(() => {
    clearGrammarRegistry();
  });

  describe('getCreatableTypes', () => {
    it('returns binding, worker, milestone, goal', () => {
      const types = policy.getCreatableTypes(null, model([]));
      const typeNames = types.map(t => t.type);
      expect(typeNames).toEqual(['binding', 'worker', 'milestone', 'goal']);
    });

    it('does not include subcase', () => {
      const types = policy.getCreatableTypes(null, model([]));
      expect(types.find(t => t.type === 'subcase')).toBeUndefined();
    });

    it('includes label and icon for each type', () => {
      const types = policy.getCreatableTypes(null, model([]));
      for (const t of types) {
        expect(t.label).toBeTruthy();
        expect(t.icon).toBeTruthy();
      }
    });
  });

  describe('canConnect', () => {
    it('allows binding → worker', () => {
      const b = node('b1', 'binding');
      const w = node('w1', 'worker');
      expect(policy.canConnect(b, w, model([b, w]))).toBe(true);
    });

    it('allows worker → binding', () => {
      const w = node('w1', 'worker');
      const b = node('b1', 'binding');
      expect(policy.canConnect(w, b, model([w, b]))).toBe(true);
    });

    it('allows milestone → binding', () => {
      const m = node('m1', 'milestone');
      const b = node('b1', 'binding');
      expect(policy.canConnect(m, b, model([m, b]))).toBe(true);
    });

    it('allows goal → milestone', () => {
      const g = node('g1', 'goal');
      const m = node('m1', 'milestone');
      expect(policy.canConnect(g, m, model([g, m]))).toBe(false);
    });

    it('rejects worker → worker', () => {
      const w1 = node('w1', 'worker');
      const w2 = node('w2', 'worker');
      expect(policy.canConnect(w1, w2, model([w1, w2]))).toBe(false);
    });

    it('rejects binding → binding', () => {
      const b1 = node('b1', 'binding');
      const b2 = node('b2', 'binding');
      expect(policy.canConnect(b1, b2, model([b1, b2]))).toBe(false);
    });

    it('rejects binding outbound when max (1) reached', () => {
      const b = node('b1', 'binding');
      const w1 = node('w1', 'worker');
      const w2 = node('w2', 'worker');
      const m = model([b, w1, w2], [{ id: 'e1', source: 'b1', target: 'w1' }]);
      expect(policy.canConnect(b, w2, m)).toBe(false);
    });

    it('rejects unknown source type', () => {
      const u = node('u1', 'unknown');
      const w = node('w1', 'worker');
      expect(policy.canConnect(u, w, model([u, w]))).toBe(false);
    });
  });

  describe('getInsertableTypes', () => {
    it('returns empty array', () => {
      const edge = { id: 'e1', type: 'default', source: 'b1', target: 'w1' };
      expect(policy.getInsertableTypes(edge, model([]))).toEqual([]);
    });
  });

  describe('canDelete', () => {
    it('returns true for binding', () => {
      expect(policy.canDelete(node('b1', 'binding'), model([]))).toBe(true);
    });

    it('returns true for worker', () => {
      expect(policy.canDelete(node('w1', 'worker'), model([]))).toBe(true);
    });

    it('returns true for milestone', () => {
      expect(policy.canDelete(node('m1', 'milestone'), model([]))).toBe(true);
    });

    it('returns true for goal', () => {
      expect(policy.canDelete(node('g1', 'goal'), model([]))).toBe(true);
    });

    it('returns false for subcase', () => {
      expect(policy.canDelete(node('sc1', 'subcase'), model([]))).toBe(false);
    });
  });

  describe('getDeleteStrategy', () => {
    it('returns disconnect for binding even with 1-in/1-out (bipartite graph prevents auto-join)', () => {
      const w1 = node('w1', 'worker');
      const b = node('b1', 'binding');
      const w2 = node('w2', 'worker');
      const m = model([w1, b, w2], [
        { id: 'e1', source: 'w1', target: 'b1' },
        { id: 'e2', source: 'b1', target: 'w2' },
      ]);
      expect(policy.getDeleteStrategy(b, m)).toEqual({ type: 'disconnect' });
    });

    it('returns disconnect for worker even with 1-in/1-out (bipartite graph prevents auto-join)', () => {
      const b1 = node('b1', 'binding');
      const w = node('w1', 'worker');
      const b2 = node('b2', 'binding');
      const m = model([b1, w, b2], [
        { id: 'e1', source: 'b1', target: 'w1' },
        { id: 'e2', source: 'w1', target: 'b2' },
      ]);
      expect(policy.getDeleteStrategy(w, m)).toEqual({ type: 'disconnect' });
    });

    it('returns disconnect for milestone', () => {
      const b = node('b1', 'binding');
      const m = node('m1', 'milestone');
      const b2 = node('b2', 'binding');
      const g = model([b, m, b2], [
        { id: 'e1', source: 'b1', target: 'm1' },
        { id: 'e2', source: 'm1', target: 'b2' },
      ]);
      expect(policy.getDeleteStrategy(m, g)).toEqual({ type: 'disconnect' });
    });

    it('returns disconnect for goal', () => {
      expect(policy.getDeleteStrategy(node('g1', 'goal'), model([]))).toEqual({ type: 'disconnect' });
    });

    it('returns disconnect for binding with multiple edges', () => {
      const w1 = node('w1', 'worker');
      const w2 = node('w2', 'worker');
      const b = node('b1', 'binding');
      const m = model([w1, w2, b], [
        { id: 'e1', source: 'w1', target: 'b1' },
        { id: 'e2', source: 'w2', target: 'b1' },
      ]);
      expect(policy.getDeleteStrategy(b, m)).toEqual({ type: 'disconnect' });
    });
  });
});
