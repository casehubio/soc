import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerGrammar, clearGrammarRegistry } from '@casehubio/graph-core';
import type { GraphModel, GraphNode } from '@casehubio/graph-core';
import { createSwfEditPolicy } from './swf-edit-policy.js';
import { callGrammar } from '../stencils/call.js';
import { setGrammar } from '../stencils/set.js';
import { switchGrammar } from '../stencils/switch.js';
import { raiseGrammar } from '../stencils/raise.js';
import { tryGrammar } from '../stencils/try.js';
import { startGrammar, endGrammar, entryGrammar, exitGrammar } from '../stencils/boundary.js';
import { doGrammar } from '../stencils/do.js';
import { forkGrammar } from '../stencils/fork.js';
import { emitGrammar } from '../stencils/emit.js';
import { listenGrammar } from '../stencils/listen.js';
import { runGrammar } from '../stencils/run.js';
import { waitGrammar } from '../stencils/wait.js';
import { forGrammar } from '../stencils/for.js';

function node(id: string, type: string, props: Record<string, unknown> = {}): GraphNode {
  return { id, type, properties: props };
}

function model(nodes: GraphNode[], edges: { id: string; source: string; target: string }[] = []): GraphModel {
  return {
    nodes,
    edges: edges.map(e => ({ ...e, type: 'flow' })),
  };
}

describe('SwfEditPolicy', () => {
  const policy = createSwfEditPolicy();

  beforeAll(() => {
    registerGrammar(callGrammar);
    registerGrammar(setGrammar);
    registerGrammar(switchGrammar);
    registerGrammar(raiseGrammar);
    registerGrammar(tryGrammar);
    registerGrammar(startGrammar);
    registerGrammar(endGrammar);
    registerGrammar(entryGrammar);
    registerGrammar(exitGrammar);
    registerGrammar(doGrammar);
    registerGrammar(forkGrammar);
    registerGrammar(emitGrammar);
    registerGrammar(listenGrammar);
    registerGrammar(runGrammar);
    registerGrammar(waitGrammar);
    registerGrammar(forGrammar);
  });

  afterAll(() => {
    clearGrammarRegistry();
  });

  describe('getCreatableTypes', () => {
    it('returns all 12 creatable task types', () => {
      const types = policy.getCreatableTypes(null, model([]));
      const typeNames = types.map(t => t.type);
      expect(typeNames).toEqual([
        'swf-call', 'swf-set', 'swf-switch', 'swf-for', 'swf-do', 'swf-fork',
        'swf-emit', 'swf-listen', 'swf-run', 'swf-wait', 'swf-raise', 'swf-try',
      ]);
    });

    it('does not include boundary or synthetic types', () => {
      const types = policy.getCreatableTypes(null, model([]));
      const typeNames = new Set(types.map(t => t.type));
      expect(typeNames.has('swf-start')).toBe(false);
      expect(typeNames.has('swf-end')).toBe(false);
      expect(typeNames.has('swf-entry')).toBe(false);
      expect(typeNames.has('swf-exit')).toBe(false);
      expect(typeNames.has('swf-root')).toBe(false);
      expect(typeNames.has('swf-generic')).toBe(false);
      expect(typeNames.has('swf-try-catch')).toBe(false);
      expect(typeNames.has('swf-catch')).toBe(false);
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
    it('allows call → call', () => {
      const c1 = node('c1', 'swf-call');
      const c2 = node('c2', 'swf-call');
      expect(policy.canConnect(c1, c2, model([c1, c2]))).toBe(true);
    });

    it('allows call → set', () => {
      const c = node('c1', 'swf-call');
      const s = node('s1', 'swf-set');
      expect(policy.canConnect(c, s, model([c, s]))).toBe(true);
    });

    it('allows set → switch', () => {
      const s = node('s1', 'swf-set');
      const sw = node('sw1', 'swf-switch');
      expect(policy.canConnect(s, sw, model([s, sw]))).toBe(true);
    });

    it('allows start → end (empty workflow)', () => {
      const s = node('s1', 'swf-start');
      const e = node('e1', 'swf-end');
      expect(policy.canConnect(s, e, model([s, e]))).toBe(true);
    });

    it('rejects end → call (end has no outbound)', () => {
      const e = node('e1', 'swf-end');
      const c = node('c1', 'swf-call');
      expect(policy.canConnect(e, c, model([e, c]))).toBe(false);
    });

    it('rejects call outbound when max (1) reached', () => {
      const c1 = node('c1', 'swf-call');
      const c2 = node('c2', 'swf-call');
      const c3 = node('c3', 'swf-call');
      const m = model([c1, c2, c3], [{ id: 'e1', source: 'c1', target: 'c2' }]);
      expect(policy.canConnect(c1, c3, m)).toBe(false);
    });
  });

  describe('getInsertableTypes', () => {
    it('returns creatable types for a normal flow edge', () => {
      const s = node('s1', 'swf-start');
      const c = node('c1', 'swf-call');
      const e = node('e1', 'swf-end');
      const m = model([s, c, e], [
        { id: 'e1', source: 's1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'e1' },
      ]);
      const edge = m.edges.find(ed => ed.id === 'e2')!;
      const types = policy.getInsertableTypes(edge, m);
      const typeNames = types.map(t => t.type);
      expect(typeNames.length).toBeGreaterThan(0);
      expect(typeNames).toContain('swf-call');
      expect(typeNames).toContain('swf-set');
      expect(typeNames).toContain('swf-emit');
    });

    it('excludes non-deletable types from insertable list', () => {
      const s = node('s1', 'swf-start');
      const e = node('e1', 'swf-end');
      const m = model([s, e], [
        { id: 'e1', source: 's1', target: 'e1' },
      ]);
      const edge = m.edges[0]!;
      const types = policy.getInsertableTypes(edge, m);
      const typeNames = new Set(types.map(t => t.type));
      expect(typeNames.has('swf-start')).toBe(false);
      expect(typeNames.has('swf-end')).toBe(false);
      expect(typeNames.has('swf-entry')).toBe(false);
      expect(typeNames.has('swf-exit')).toBe(false);
      expect(typeNames.has('swf-root')).toBe(false);
    });

    it('returns all 12 creatable types for a standard edge', () => {
      const s = node('s1', 'swf-start');
      const c = node('c1', 'swf-call');
      const e = node('e1', 'swf-end');
      const m = model([s, c, e], [
        { id: 'e1', source: 's1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'e1' },
      ]);
      const edge = m.edges.find(ed => ed.id === 'e2')!;
      const types = policy.getInsertableTypes(edge, m);
      expect(types.length).toBe(12);
    });
  });

  describe('canDelete', () => {
    it('returns true for call', () => {
      expect(policy.canDelete(node('c1', 'swf-call'), model([]))).toBe(true);
    });

    it('returns true for set', () => {
      expect(policy.canDelete(node('s1', 'swf-set'), model([]))).toBe(true);
    });

    it('returns true for switch', () => {
      expect(policy.canDelete(node('sw1', 'swf-switch'), model([]))).toBe(true);
    });

    it('returns true for raise', () => {
      expect(policy.canDelete(node('r1', 'swf-raise'), model([]))).toBe(true);
    });

    it('returns true for try', () => {
      expect(policy.canDelete(node('t1', 'swf-try'), model([]))).toBe(true);
    });

    it('returns false for start', () => {
      expect(policy.canDelete(node('s1', 'swf-start'), model([]))).toBe(false);
    });

    it('returns false for end', () => {
      expect(policy.canDelete(node('e1', 'swf-end'), model([]))).toBe(false);
    });

    it('returns false for entry', () => {
      expect(policy.canDelete(node('en1', 'swf-entry'), model([]))).toBe(false);
    });

    it('returns false for exit', () => {
      expect(policy.canDelete(node('ex1', 'swf-exit'), model([]))).toBe(false);
    });

    it('returns false for root', () => {
      expect(policy.canDelete(node('r1', 'swf-root'), model([]))).toBe(false);
    });
  });

  describe('getDeleteStrategy', () => {
    it('returns auto-join for call with 1 inbound and 1 outbound', () => {
      const c1 = node('c1', 'swf-call');
      const c2 = node('c2', 'swf-call');
      const c3 = node('c3', 'swf-call');
      const m = model([c1, c2, c3], [
        { id: 'e1', source: 'c1', target: 'c2' },
        { id: 'e2', source: 'c2', target: 'c3' },
      ]);
      expect(policy.getDeleteStrategy(c2, m)).toEqual({ type: 'auto-join' });
    });

    it('returns disconnect for node with no edges', () => {
      expect(policy.getDeleteStrategy(node('c1', 'swf-call'), model([]))).toEqual({ type: 'disconnect' });
    });

    it('returns disconnect for node with multiple inbound', () => {
      const c1 = node('c1', 'swf-call');
      const c2 = node('c2', 'swf-call');
      const sw = node('sw1', 'swf-switch');
      const m = model([c1, sw, c2], [
        { id: 'e1', source: 'c1', target: 'sw1' },
        { id: 'e2', source: 'c2', target: 'sw1' },
      ]);
      expect(policy.getDeleteStrategy(sw, m)).toEqual({ type: 'disconnect' });
    });
  });
});
