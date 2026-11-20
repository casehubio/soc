import { describe, it, expect } from 'vitest';
import type { PhaseItem } from './coordination-types.js';
import { assignTiers, detectPreferredView } from './coordination-graph-model.js';
import type { GraphTier, GraphConnector } from './coordination-graph-model.js';

describe('assignTiers', () => {
  it('assigns single step to one tier', () => {
    const phases: PhaseItem[] = [
      { type: 'step', action: 'agent-delegate', target: 'classifier' },
    ];
    const result = assignTiers(phases);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('tier');
    const tier = result[0] as GraphTier;
    expect(tier.nodes).toHaveLength(1);
    expect(tier.nodes[0].step.target).toBe('classifier');
  });

  it('assigns two consecutive steps to separate tiers with flow connector', () => {
    const phases: PhaseItem[] = [
      { type: 'step', action: 'agent-delegate', target: 'step-a' },
      { type: 'step', action: 'agent-delegate', target: 'step-b' },
    ];
    const result = assignTiers(phases);
    expect(result).toHaveLength(3);
    expect(result[0].kind).toBe('tier');
    expect(result[1].kind).toBe('connector');
    expect((result[1] as GraphConnector).type).toBe('flow');
    expect(result[2].kind).toBe('tier');
  });

  it('assigns parallel block as multi-node tier with fan-out connector', () => {
    const phases: PhaseItem[] = [
      { type: 'step', action: 'agent-delegate', target: 'classifier' },
      { type: 'signal', name: 'classified', description: 'fan-out' },
      {
        type: 'parallel',
        lanes: {
          'identity': [{ action: 'agent-delegate', target: 'id-extract' }],
          'financial': [{ action: 'agent-delegate', target: 'fin-extract' }],
          'address': [{ action: 'agent-delegate', target: 'addr-extract' }],
        },
      },
      { type: 'quorum', name: 'done', required: 2, of: 3 },
      { type: 'step', action: 'agent-delegate', target: 'risk-assessor' },
    ];
    const result = assignTiers(phases);

    expect(result[0].kind).toBe('tier');
    expect((result[0] as GraphTier).nodes).toHaveLength(1);

    expect(result[1].kind).toBe('connector');
    const fanOut = result[1] as GraphConnector;
    expect(fanOut.type).toBe('fan-out');
    expect(fanOut.labels).toEqual(['identity', 'financial', 'address']);
    expect(fanOut.barrier).toBeDefined();
    expect(fanOut.barrier!.type).toBe('signal');

    expect(result[2].kind).toBe('tier');
    expect((result[2] as GraphTier).nodes).toHaveLength(3);

    expect(result[3].kind).toBe('connector');
    const fanIn = result[3] as GraphConnector;
    expect(fanIn.type).toBe('fan-in');
    expect(fanIn.barrier).toBeDefined();
    expect(fanIn.barrier!.type).toBe('quorum');
    expect(fanIn.barrier!.required).toBe(2);
    expect(fanIn.barrier!.of).toBe(3);

    expect(result[4].kind).toBe('tier');
    expect((result[4] as GraphTier).nodes).toHaveLength(1);
  });

  it('assigns match routing as decision tier + outcomes tier', () => {
    const phases: PhaseItem[] = [
      {
        type: 'step',
        action: 'agent-delegate',
        target: 'risk-assessor',
        routing: {
          expression: '${result.decision}',
          cases: [
            { pattern: 'approve', step: { action: 'rest', target: '/approve' } },
            { pattern: 'escalate', step: { action: 'agent-delegate', target: 'reviewer' } },
            { pattern: 'reject', step: { action: 'rest', target: '/reject' } },
          ],
        },
      },
    ];
    const result = assignTiers(phases);

    expect(result[0].kind).toBe('tier');
    expect((result[0] as GraphTier).nodes[0].step.target).toBe('risk-assessor');
    expect((result[0] as GraphTier).nodes[0].routing).toBeDefined();

    expect(result[1].kind).toBe('connector');
    expect((result[1] as GraphConnector).type).toBe('outcomes');

    expect(result[2].kind).toBe('tier');
    const outcomes = result[2] as GraphTier;
    expect(outcomes.nodes).toHaveLength(3);
    expect(outcomes.nodes[0].colorHint).toBe('green');
    expect(outcomes.nodes[1].colorHint).toBe('amber');
    expect(outcomes.nodes[2].colorHint).toBe('red');
  });

  it('uses first step from multi-step lane and adds extraStepCount', () => {
    const phases: PhaseItem[] = [
      {
        type: 'parallel',
        lanes: {
          'lane-a': [
            { action: 'agent-delegate', target: 'primary' },
            { action: 'rest', target: '/secondary' },
            { action: 'graphql', target: 'third' },
          ],
        },
      },
    ];
    const result = assignTiers(phases);
    const tier = result.find(e => e.kind === 'tier') as GraphTier;
    expect(tier.nodes[0].step.target).toBe('primary');
    expect(tier.nodes[0].extraStepCount).toBe(2);
  });
});

describe('detectPreferredView', () => {
  it('returns graph when parallel + quorum present', () => {
    const phases: PhaseItem[] = [
      { type: 'step', action: 'agent-delegate', target: 'a' },
      { type: 'parallel', lanes: { x: [{ action: 'rest', target: 'y' }] } },
      { type: 'quorum', name: 'q', required: 1, of: 1 },
    ];
    expect(detectPreferredView(phases)).toBe('graph');
  });

  it('returns lanes when no parallel', () => {
    const phases: PhaseItem[] = [
      { type: 'step', action: 'agent-delegate', target: 'a' },
      { type: 'step', action: 'rest', target: 'b' },
    ];
    expect(detectPreferredView(phases)).toBe('lanes');
  });

  it('returns lanes when parallel without quorum', () => {
    const phases: PhaseItem[] = [
      { type: 'parallel', lanes: { x: [{ action: 'rest', target: 'y' }] } },
    ];
    expect(detectPreferredView(phases)).toBe('lanes');
  });
});
