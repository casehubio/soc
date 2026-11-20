import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerGrammar,
  deregisterGrammar,
  getGrammar,
  getAllGrammars,
  clearGrammarRegistry,
} from './grammar.js';
import type { StencilGrammar } from './grammar.js';

function grammar(type: string): StencilGrammar {
  return {
    type,
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: [] },
      outbound: { min: 0, max: Infinity, allowedTo: [] },
    },
  };
}

describe('grammar registry', () => {
  beforeEach(() => {
    clearGrammarRegistry();
  });

  it('starts empty', () => {
    expect(getAllGrammars()).toEqual([]);
    expect(getGrammar('anything')).toBeUndefined();
  });

  it('registers and retrieves a grammar by type', () => {
    const g = grammar('binding');
    registerGrammar(g);
    expect(getGrammar('binding')).toBe(g);
  });

  it('replaces on duplicate registration (idempotent)', () => {
    const g1 = grammar('worker');
    const g2: StencilGrammar = {
      type: 'worker',
      connections: {
        inbound: { min: 1, max: 5, allowedFrom: ['binding'] },
        outbound: { min: 0, max: 0, allowedTo: [] },
      },
    };
    registerGrammar(g1);
    registerGrammar(g2);
    expect(getGrammar('worker')).toBe(g2);
  });

  it('returns undefined for unregistered type', () => {
    registerGrammar(grammar('binding'));
    expect(getGrammar('milestone')).toBeUndefined();
  });

  it('lists all registered grammars', () => {
    registerGrammar(grammar('binding'));
    registerGrammar(grammar('worker'));
    registerGrammar(grammar('milestone'));
    const all = getAllGrammars();
    expect(all).toHaveLength(3);
    expect(all.map(g => g.type).sort()).toEqual(['binding', 'milestone', 'worker']);
  });

  it('clears all registrations', () => {
    registerGrammar(grammar('binding'));
    registerGrammar(grammar('worker'));
    clearGrammarRegistry();
    expect(getAllGrammars()).toEqual([]);
    expect(getGrammar('binding')).toBeUndefined();
  });

  it('deregisters a grammar by type', () => {
    registerGrammar(grammar('temp'));
    expect(getGrammar('temp')).toBeDefined();
    const removed = deregisterGrammar('temp');
    expect(removed).toBe(true);
    expect(getGrammar('temp')).toBeUndefined();
  });

  it('returns false when deregistering unknown type', () => {
    const removed = deregisterGrammar('nonexistent');
    expect(removed).toBe(false);
  });

  it('supports connection rules with specific allowedFrom/allowedTo', () => {
    const g: StencilGrammar = {
      type: 'goal',
      connections: {
        inbound: { min: 0, max: 0, allowedFrom: [] },
        outbound: { min: 0, max: 1, allowedTo: ['milestone'] },
      },
    };
    registerGrammar(g);
    const retrieved = getGrammar('goal');
    expect(retrieved?.connections.outbound.max).toBe(1);
    expect(retrieved?.connections.outbound.allowedTo).toEqual(['milestone']);
    expect(retrieved?.connections.inbound.max).toBe(0);
  });
});
