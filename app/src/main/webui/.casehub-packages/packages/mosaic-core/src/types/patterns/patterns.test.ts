import { describe, it, expect } from 'vitest';
import type {
  AgencyCategoryName,
  PatternCategoryName,
  PatternCategory,
  OrchestrationPatternCategory,
  DeliberationPatternCategory,
  PerceptionPatternCategory,
  OptimisationPatternCategory,
  SocialPatternCategory,
} from './index.js';
import type {
  RoutingSpec, AggregationSpec, TerminationSpec, DecompositionSpec,
} from '../orchestration.js';
import { normalizePatternType } from './normalize.js';

describe('pattern category hierarchy', () => {
  it('AgencyCategoryName covers all 7 categories', () => {
    const names: AgencyCategoryName[] = [
      'orchestration', 'deliberation', 'perception',
      'communication', 'governance', 'optimisation', 'social',
    ];
    expect(names).toHaveLength(7);
  });

  it('PatternCategoryName includes playbook', () => {
    const names: PatternCategoryName[] = [
      'playbook', 'orchestration', 'deliberation', 'perception',
      'communication', 'governance', 'optimisation', 'social',
    ];
    expect(names).toHaveLength(8);
  });

  it('OrchestrationPatternCategory discriminates on category + type', () => {
    const p: OrchestrationPatternCategory = {
      category: 'orchestration',
      type: 'supervisor',
      name: 'risk-supervisor',
    };
    expect(p.category).toBe('orchestration');
    expect(p.type).toBe('supervisor');
  });

  it('DeliberationPatternCategory has judgment fields', () => {
    const p: DeliberationPatternCategory = {
      category: 'deliberation',
      type: 'voting',
      name: 'risk-vote',
      maxRounds: 3,
      judgment: {
        trigger: { type: 'confidenceThreshold', threshold: 0.8 },
        caller: { type: 'fanOut' },
      },
    };
    expect(p.maxRounds).toBe(3);
    expect(p.judgment!.trigger!.type).toBe('confidenceThreshold');
  });

  it('PatternCategory union narrows on category field', () => {
    const p: PatternCategory = {
      category: 'deliberation',
      type: 'debate',
      name: 'policy-debate',
      maxRounds: 5,
    };
    if (p.category === 'deliberation') {
      expect(p.maxRounds).toBe(5);
    }
  });

  it('PerceptionPatternCategory has pipeline and world fields', () => {
    const p: PerceptionPatternCategory = {
      category: 'perception',
      type: 'summarisation',
      name: 'doc-summary',
      pipeline: {
        source: 'case.document.updated',
        levels: [
          { grouping: 'windowed', summariser: { type: 'llm' }, emit: 'summary.l1' },
          { grouping: 'keyed', summariser: { type: 'extractive' }, emit: 'summary.l2' },
        ],
      },
    };
    expect(p.pipeline!.levels).toHaveLength(2);
    expect(p.pipeline!.source).toBe('case.document.updated');
  });

  it('PerceptionPatternCategory observation has world spec', () => {
    const p: PerceptionPatternCategory = {
      category: 'perception',
      type: 'observation',
      world: {
        actions: ['inspect', 'query'],
        sections: [{ type: 'entity-group', requiredTags: ['active'] }],
        renderer: { verbatimThreshold: 5, groupedThreshold: 20 },
      },
    };
    expect(p.world!.renderer!.verbatimThreshold).toBe(5);
    expect(p.world!.sections).toHaveLength(1);
  });

  it('OptimisationPatternCategory has pipelines map', () => {
    const p: OptimisationPatternCategory = {
      category: 'optimisation',
      type: 'prompt-optimisation',
      name: 'risk-prompt-tuning',
      pipelines: {
        'risk-assessment': {
          signature: { id: 'risk-v1', baseSystemPrompt: 'Assess risk factors' },
          optimiser: { type: 'few-shot', diversityStrategy: 'max-marginal' },
          config: { maxExamples: 10, minQualityThreshold: 0.7 },
          safety: { qualityFloor: 0.5, circuitBreakerThreshold: 0.3 },
          confidenceScorer: { type: 'composite' },
        },
      },
    };
    const pipeline = p.pipelines!['risk-assessment'];
    expect(pipeline.signature.id).toBe('risk-v1');
    expect(pipeline.optimiser.type).toBe('few-shot');
    expect(pipeline.safety!.qualityFloor).toBe(0.5);
  });

  it('SocialPatternCategory has cognition config', () => {
    const p: SocialPatternCategory = {
      category: 'social',
      type: 'cognition',
      name: 'agent-cognition',
      cognition: {
        drive: { baseLevel: 0.5 },
        mood: { volatility: 0.3 },
        retention: { retentionThreshold: 0.6, confidenceWeight: 0.4 },
      },
    };
    expect(p.cognition!.retention!.retentionThreshold).toBe(0.6);
  });

  it('SocialPatternCategory memory-hygiene uses retention config', () => {
    const p: SocialPatternCategory = {
      category: 'social',
      type: 'memory-hygiene',
      retention: {
        retentionThreshold: 0.5,
        confidenceWeight: 0.3,
        recencyWeight: 0.3,
        scopeWeight: 0.2,
        trustWeight: 0.2,
      },
    };
    expect(p.retention!.confidenceWeight).toBe(0.3);
  });
});

describe('sub-spec discriminated unions', () => {
  it('RoutingSpec discriminates on type field', () => {
    const r: RoutingSpec = { type: 'first-match' };
    expect(r.type).toBe('first-match');
  });

  it('AggregationSpec discriminates on type field', () => {
    const a: AggregationSpec = { type: 'collect-all' };
    expect(a.type).toBe('collect-all');
  });

  it('TerminationSpec discriminates on type field', () => {
    const t: TerminationSpec = { type: 'goal-reached' };
    expect(t.type).toBe('goal-reached');
  });

  it('DecompositionSpec discriminates on type field', () => {
    const d: DecompositionSpec = { type: 'llm' };
    expect(d.type).toBe('llm');
  });

  it('OrchestrationPatternCategory uses typed routing and decomposition', () => {
    const p: OrchestrationPatternCategory = {
      category: 'orchestration',
      type: 'supervisor',
      name: 'risk-supervisor',
      routing: { type: 'first-match' },
      decomposition: { type: 'static' },
      aggregation: { type: 'collect-all' },
      termination: [{ type: 'max-iterations' }],
    };
    expect(p.routing!.type).toBe('first-match');
  });
});

describe('normalizePatternType', () => {
  it('converts UPPERCASE to lowercase', () => {
    expect(normalizePatternType('SUPERVISOR')).toBe('supervisor');
    expect(normalizePatternType('VOTING')).toBe('voting');
  });

  it('passes through lowercase unchanged', () => {
    expect(normalizePatternType('debate')).toBe('debate');
  });
});
