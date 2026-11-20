import type { GraphModel } from '@casehubio/graph-core';
import type {
  Phase, FactBase, ClassificationRule, LayoutRule, HardConstraint,
  CompositionReport, CompositionError, LayoutNode, LayoutEdge,
  LayoutViolation, ArchetypeHint, ArchetypeName, LayoutStrategy,
  LayoutExplanation, RuleSelection,
} from './types.js';
import type { ElkLayoutOptions } from './elk-layout.js';
import { createFactBase } from './fact-base.js';

const POST_LAYOUT_PHASES: Exclude<Phase, 'classification' | 'sizing'>[] = [
  'internal-layout', 'container-positioning', 'edge-routing',
];

export interface PreLayoutResult {
  facts: FactBase;
  strategy: LayoutStrategy;
  archetype: ArchetypeHint;
  nodeSizes: ReadonlyMap<string, { width: number; height: number }>;
  report: CompositionReport;
}

export interface PostLayoutResult {
  violations: LayoutViolation[];
  explanation?: LayoutExplanation;
}

const DEFAULT_STRATEGY_OPTIONS: Record<LayoutStrategy, ElkLayoutOptions> = {
  'star': { algorithm: 'mrtree', direction: 'DOWN', spacing: 120 },
  'tree': { algorithm: 'mrtree', direction: 'DOWN', spacing: 100 },
  'circular': { algorithm: 'stress', spacing: 120, elkOptions: { 'elk.stress.desiredEdgeLength': '200' } },
  'layered': { algorithm: 'layered', direction: 'DOWN', spacing: 100, elkOptions: { 'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP' } },
  'nested': { algorithm: 'layered', direction: 'DOWN', spacing: 100, containerPadding: 40 },
  'hub-spoke': { algorithm: 'stress', spacing: 120, elkOptions: { 'elk.stress.desiredEdgeLength': '180' } },
  'flow': { algorithm: 'layered', direction: 'RIGHT', spacing: 80, elkOptions: { 'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS' } },
  'radial': { algorithm: 'radial', spacing: 120 },
  'grid': { algorithm: 'layered', direction: 'DOWN', spacing: 100 },
  'force': { algorithm: 'force', spacing: 120, elkOptions: { 'elk.force.temperature': '0.001' } },
};

export class LayoutEngine {
  private classifiers: ClassificationRule[] = [];
  private rules: LayoutRule[] = [];
  private constraints: HardConstraint[] = [];

  register(item: ClassificationRule | LayoutRule | HardConstraint): void {
    if ('classify' in item) this.classifiers.push(item);
    else if ('check' in item) this.constraints.push(item);
    else this.rules.push(item);
  }

  preLayout(model: GraphModel): PreLayoutResult {
    const facts = createFactBase();

    for (const c of this.classifiers) c.classify(model, facts);

    const sizingRules = this.resolvePhase('sizing', facts);
    const emptyNodes: LayoutNode[] = [];
    const emptyEdges: LayoutEdge[] = [];
    for (const r of sizingRules) r.apply(emptyNodes, emptyEdges, facts);

    const strategy = (facts.get('graph', 'recommended-strategy') as LayoutStrategy | undefined) ?? 'force';
    const archetypeName = (facts.get('graph', 'archetype') as ArchetypeName | undefined) ?? 'simple-structure';
    const confidence = (facts.get('graph', 'archetype-confidence') as 'high' | 'medium' | 'low' | undefined) ?? 'low';
    const nodeSizes = (facts.get('graph', 'node-sizes') as ReadonlyMap<string, { width: number; height: number }> | undefined) ?? new Map();
    const report = this.validateComposition(facts);

    return {
      facts,
      strategy,
      archetype: { archetype: archetypeName, confidence, layout: strategy },
      nodeSizes,
      report,
    };
  }

  postLayout(nodes: LayoutNode[], edges: LayoutEdge[], facts: FactBase, options?: { explain?: boolean }): PostLayoutResult {
    const selections: RuleSelection[] = [];
    for (const phase of POST_LAYOUT_PHASES) {
      const selected = this.resolvePhase(phase, facts, options?.explain ? selections : undefined);
      for (const rule of selected) rule.apply(nodes, edges, facts);
    }
    const violations: LayoutViolation[] = [];
    for (const c of this.constraints) violations.push(...c.check(nodes, edges));
    const result: PostLayoutResult = { violations };
    if (options?.explain) {
      result.explanation = {
        classifications: facts.facts(),
        ruleSelections: selections,
        violations,
      };
    }
    return result;
  }

  validateComposition(facts: FactBase): CompositionReport {
    const errors: CompositionError[] = [];
    const warnings: string[] = [];
    const selectedMap = new Map<Phase, LayoutRule[]>();

    for (const phase of [...POST_LAYOUT_PHASES, 'sizing'] as Phase[]) {
      selectedMap.set(phase, this.resolvePhase(phase, facts));
    }

    const allProvided = new Set<string>();
    for (const rules of selectedMap.values()) {
      for (const r of rules) {
        for (const g of r.guarantees ?? []) allProvided.add(g);
      }
    }

    for (const rules of selectedMap.values()) {
      for (const r of rules) {
        for (const req of r.requires ?? []) {
          if (!allProvided.has(req)) {
            errors.push({
              type: 'missing-provider',
              message: `Rule "${r.id}" requires "${req}" but no rule provides it`,
              ruleIds: [r.id],
            });
          }
        }
      }
    }

    const guaranteeOwners = new Map<string, string[]>();
    for (const rules of selectedMap.values()) {
      for (const r of rules) {
        for (const g of r.guarantees ?? []) {
          const owners = guaranteeOwners.get(g) ?? [];
          owners.push(r.id);
          guaranteeOwners.set(g, owners);
        }
      }
    }
    for (const [g, owners] of guaranteeOwners) {
      if (owners.length > 1) {
        errors.push({
          type: 'conflicting-guarantees',
          message: `Multiple rules provide "${g}": ${owners.join(', ')}`,
          ruleIds: owners,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings, selectedRules: selectedMap };
  }

  elkOptions(strategy: LayoutStrategy): ElkLayoutOptions {
    return { ...DEFAULT_STRATEGY_OPTIONS[strategy] };
  }

  private resolvePhase(phase: Phase, facts: FactBase, selections?: RuleSelection[]): LayoutRule[] {
    const phaseRules = this.rules.filter(r => r.phase === phase);
    const groups = new Map<string, LayoutRule[]>();
    const ungrouped: LayoutRule[] = [];

    for (const r of phaseRules) {
      if (r.group) {
        const list = groups.get(r.group) ?? [];
        list.push(r);
        groups.set(r.group, list);
      } else {
        ungrouped.push(r);
      }
    }

    const selected: LayoutRule[] = [];

    for (const [groupName, candidates] of groups) {
      const sorted = [...candidates].sort((a, b) => a.priority - b.priority);
      const winner = sorted.find(r => r.precondition(facts));
      if (winner) selected.push(winner);
      if (selections) {
        selections.push({
          group: groupName,
          candidates: sorted.map(r => ({ rule: r.id, applicable: r.precondition(facts), priority: r.priority })),
          selected: winner?.id ?? '',
          reason: winner ? `highest-priority applicable rule (priority ${winner.priority})` : 'no applicable rule',
        });
      }
    }

    for (const r of ungrouped) {
      if (r.precondition(facts)) selected.push(r);
    }

    return selected;
  }
}
