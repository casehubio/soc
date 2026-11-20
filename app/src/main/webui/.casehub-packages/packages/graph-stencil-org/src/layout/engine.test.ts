import { describe, it, expect } from 'vitest';
import { OrgLayoutEngine } from './engine.js';
import type { ClassificationRule, LayoutRule, HardConstraint, LayoutNode, LayoutEdge } from './types.js';
import type { GraphModel } from '@casehubio/graph-core';

const EMPTY_MODEL: GraphModel = { nodes: [], edges: [] };

const stubClassifier: ClassificationRule = {
  id: 'test-classifier',
  classify(_model, facts) {
    facts.assert('graph', 'test-fact', true);
  },
};

const stubSizingRule: LayoutRule = {
  id: 'test-sizing',
  phase: 'sizing',
  priority: 1,
  scope: 'global',
  guarantees: ['nodes-sized'],
  precondition: () => true,
  apply(_nodes, _edges, facts) {
    facts.assert('graph', 'sized', true);
  },
};

const stubInternalRule: LayoutRule = {
  id: 'test-internal-a',
  phase: 'internal-layout',
  group: 'internal-layout',
  priority: 1,
  scope: 'global',
  requires: ['nodes-sized'],
  guarantees: ['agents-positioned'],
  precondition: () => true,
  apply(nodes) {
    for (const n of nodes) {
      if (n.type === 'org-agent') n.position = { x: 10, y: 10 };
    }
  },
};

const stubInternalRuleB: LayoutRule = {
  id: 'test-internal-b',
  phase: 'internal-layout',
  group: 'internal-layout',
  priority: 2,
  scope: 'global',
  guarantees: ['agents-positioned'],
  precondition: () => true,
  apply() { /* lower priority, should not fire */ },
};

const noOverlapConstraint: HardConstraint = {
  id: 'HR-test',
  check(nodes) {
    return nodes.length > 10
      ? [{ rule: 'HR-test', severity: 'hard' as const, message: 'too many nodes', nodeIds: [] }]
      : [];
  },
};

describe('OrgLayoutEngine', () => {
  describe('preLayout', () => {
    it('runs classification rules and produces facts', () => {
      const engine = new OrgLayoutEngine();
      engine.register(stubClassifier);
      const result = engine.preLayout(EMPTY_MODEL);
      expect(result.facts.has('graph', 'test-fact')).toBe(true);
    });

    it('runs sizing rules during preLayout', () => {
      const engine = new OrgLayoutEngine();
      engine.register(stubSizingRule);
      const result = engine.preLayout(EMPTY_MODEL);
      expect(result.facts.has('graph', 'sized')).toBe(true);
    });

    it('returns strategy and archetype from facts', () => {
      const classifier: ClassificationRule = {
        id: 'arch',
        classify(_m, facts) {
          facts.assert('graph', 'archetype', 'federation');
          facts.assert('graph', 'archetype-confidence', 'high');
          facts.assert('graph', 'recommended-strategy', 'hub-spoke');
        },
      };
      const engine = new OrgLayoutEngine();
      engine.register(classifier);
      const result = engine.preLayout(EMPTY_MODEL);
      expect(result.strategy).toBe('hub-spoke');
      expect(result.archetype.archetype).toBe('federation');
    });

    it('defaults strategy to force when no archetype classified', () => {
      const engine = new OrgLayoutEngine();
      const result = engine.preLayout(EMPTY_MODEL);
      expect(result.strategy).toBe('force');
    });
  });

  describe('postLayout — group resolution', () => {
    it('fires highest-priority rule in a mutual-exclusion group', () => {
      const engine = new OrgLayoutEngine();
      engine.register(stubInternalRule);
      engine.register(stubInternalRuleB);
      const nodes: LayoutNode[] = [
        { id: 'a1', type: 'org-agent', parentId: 'u1', position: { x: 0, y: 0 } },
      ];
      engine.postLayout(nodes, [], engine.preLayout(EMPTY_MODEL).facts);
      expect(nodes[0]!.position).toEqual({ x: 10, y: 10 });
    });

    it('skips group rule when precondition is false', () => {
      const conditional: LayoutRule = {
        id: 'conditional',
        phase: 'internal-layout',
        group: 'test-group',
        priority: 1,
        scope: 'global',
        precondition: (facts) => facts.has('graph', 'needs-special'),
        apply(nodes) { nodes[0]!.position = { x: 99, y: 99 }; },
      };
      const fallback: LayoutRule = {
        id: 'fallback',
        phase: 'internal-layout',
        group: 'test-group',
        priority: 2,
        scope: 'global',
        precondition: () => true,
        apply(nodes) { nodes[0]!.position = { x: 50, y: 50 }; },
      };
      const engine = new OrgLayoutEngine();
      engine.register(conditional);
      engine.register(fallback);
      const nodes: LayoutNode[] = [{ id: 'a1', position: { x: 0, y: 0 } }];
      engine.postLayout(nodes, [], engine.preLayout(EMPTY_MODEL).facts);
      expect(nodes[0]!.position).toEqual({ x: 50, y: 50 });
    });
  });

  describe('postLayout — hard constraints', () => {
    it('returns violations from hard constraints', () => {
      const engine = new OrgLayoutEngine();
      engine.register(noOverlapConstraint);
      const nodes: LayoutNode[] = Array.from({ length: 11 }, (_, i) => ({
        id: `n${i}`, position: { x: 0, y: 0 },
      }));
      const result = engine.postLayout(nodes, [], engine.preLayout(EMPTY_MODEL).facts);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe('HR-test');
    });
  });

  describe('postLayout — phase ordering', () => {
    it('runs phases in order: internal-layout, container-positioning, edge-routing', () => {
      const order: string[] = [];
      const engine = new OrgLayoutEngine();
      engine.register({
        id: 'r-edge', phase: 'edge-routing', priority: 1, scope: 'global',
        precondition: () => true, apply() { order.push('edge-routing'); },
      } as LayoutRule);
      engine.register({
        id: 'r-internal', phase: 'internal-layout', priority: 1, scope: 'global',
        precondition: () => true, apply() { order.push('internal-layout'); },
      } as LayoutRule);
      engine.register({
        id: 'r-container', phase: 'container-positioning', priority: 1, scope: 'global',
        precondition: () => true, apply() { order.push('container-positioning'); },
      } as LayoutRule);
      engine.postLayout([], [], engine.preLayout(EMPTY_MODEL).facts);
      expect(order).toEqual(['internal-layout', 'container-positioning', 'edge-routing']);
    });
  });

  describe('validateComposition', () => {
    it('detects missing provider', () => {
      const engine = new OrgLayoutEngine();
      const rule: LayoutRule = {
        id: 'needs-sized', phase: 'internal-layout', priority: 1, scope: 'global',
        requires: ['nodes-sized'], precondition: () => true, apply() {},
      };
      engine.register(rule);
      const report = engine.validateComposition(engine.preLayout(EMPTY_MODEL).facts);
      expect(report.valid).toBe(false);
      expect(report.errors[0]!.type).toBe('missing-provider');
    });

    it('passes when all providers satisfied', () => {
      const engine = new OrgLayoutEngine();
      engine.register(stubSizingRule);
      engine.register(stubInternalRule);
      const report = engine.validateComposition(engine.preLayout(EMPTY_MODEL).facts);
      expect(report.valid).toBe(true);
    });

    it('detects conflicting guarantees from ungrouped rules', () => {
      const engine = new OrgLayoutEngine();
      const ruleA: LayoutRule = {
        id: 'a', phase: 'internal-layout', priority: 1, scope: 'global',
        guarantees: ['agents-positioned'], precondition: () => true, apply() {},
      };
      const ruleB: LayoutRule = {
        id: 'b', phase: 'internal-layout', priority: 1, scope: 'global',
        guarantees: ['agents-positioned'], precondition: () => true, apply() {},
      };
      engine.register(ruleA);
      engine.register(ruleB);
      const report = engine.validateComposition(engine.preLayout(EMPTY_MODEL).facts);
      expect(report.valid).toBe(false);
      expect(report.errors[0]!.type).toBe('conflicting-guarantees');
    });
  });

  describe('elkOptions', () => {
    it('maps strategy to ELK configuration', () => {
      const engine = new OrgLayoutEngine();
      const opts = engine.elkOptions('tree');
      expect(opts.algorithm).toBe('mrtree');
      expect(opts.direction).toBe('DOWN');
    });

    it('includes positive spacing for all strategies', () => {
      const engine = new OrgLayoutEngine();
      const strategies = ['star', 'tree', 'circular', 'layered', 'nested', 'hub-spoke', 'flow', 'radial', 'grid', 'force'] as const;
      for (const s of strategies) {
        expect(engine.elkOptions(s).spacing).toBeGreaterThan(0);
      }
    });

    it('maps flow to layered RIGHT', () => {
      const engine = new OrgLayoutEngine();
      const opts = engine.elkOptions('flow');
      expect(opts.algorithm).toBe('layered');
      expect(opts.direction).toBe('RIGHT');
    });

    it('maps nested to layered with container padding', () => {
      const engine = new OrgLayoutEngine();
      const opts = engine.elkOptions('nested');
      expect(opts.algorithm).toBe('layered');
      expect(opts.containerPadding).toBeGreaterThan(20);
    });
  });

  describe('explain mode', () => {
    it('returns classification facts in explanation', () => {
      const engine = new OrgLayoutEngine();
      engine.register(stubClassifier);
      engine.register(stubInternalRule);
      const pre = engine.preLayout(EMPTY_MODEL);
      const nodes: LayoutNode[] = [{ id: 'a1', type: 'org-agent', parentId: 'u1', position: { x: 0, y: 0 } }];
      const result = engine.postLayout(nodes, [], pre.facts, { explain: true });
      expect(result.explanation).toBeDefined();
      expect(result.explanation!.classifications.length).toBeGreaterThan(0);
    });

    it('returns rule selections with group and reason', () => {
      const engine = new OrgLayoutEngine();
      engine.register(stubInternalRule);
      engine.register(stubInternalRuleB);
      const pre = engine.preLayout(EMPTY_MODEL);
      const nodes: LayoutNode[] = [{ id: 'a1', position: { x: 0, y: 0 } }];
      const result = engine.postLayout(nodes, [], pre.facts, { explain: true });
      const sel = result.explanation!.ruleSelections.find(s => s.group === 'internal-layout');
      expect(sel).toBeDefined();
      expect(sel!.selected).toBe('test-internal-a');
      expect(sel!.candidates).toHaveLength(2);
    });

    it('omits explanation when explain is false', () => {
      const engine = new OrgLayoutEngine();
      const result = engine.postLayout([], [], engine.preLayout(EMPTY_MODEL).facts);
      expect(result.explanation).toBeUndefined();
    });
  });
});
