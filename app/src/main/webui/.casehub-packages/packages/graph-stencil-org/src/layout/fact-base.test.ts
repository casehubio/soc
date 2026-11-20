import { describe, it, expect } from 'vitest';
import { createFactBase } from './fact-base.js';

describe('FactBase', () => {
  it('asserts and retrieves a fact', () => {
    const fb = createFactBase();
    fb.assert('unit:oversight', 'is-linear-chain', true);
    expect(fb.has('unit:oversight', 'is-linear-chain')).toBe(true);
    expect(fb.get('unit:oversight', 'is-linear-chain')).toBe(true);
  });

  it('returns false for missing facts', () => {
    const fb = createFactBase();
    expect(fb.has('unit:x', 'is-leaf')).toBe(false);
    expect(fb.get('unit:x', 'is-leaf')).toBeUndefined();
  });

  it('queries all facts by predicate', () => {
    const fb = createFactBase();
    fb.assert('agent:a1', 'is-leaf', true);
    fb.assert('agent:a2', 'is-leaf', true);
    fb.assert('agent:a3', 'has-backup', true);
    const leafs = fb.query('is-leaf');
    expect(leafs).toHaveLength(2);
    expect(leafs.map(f => f.subject)).toContain('agent:a1');
    expect(leafs.map(f => f.subject)).toContain('agent:a2');
  });

  it('returns all facts', () => {
    const fb = createFactBase();
    fb.assert('graph', 'archetype', 'federation');
    fb.assert('graph', 'strategy', 'hub-spoke');
    expect(fb.facts()).toHaveLength(2);
  });

  it('overwrites existing fact with same subject+predicate', () => {
    const fb = createFactBase();
    fb.assert('graph', 'strategy', 'tree');
    fb.assert('graph', 'strategy', 'layered');
    expect(fb.get('graph', 'strategy')).toBe('layered');
    expect(fb.facts()).toHaveLength(1);
  });
});
