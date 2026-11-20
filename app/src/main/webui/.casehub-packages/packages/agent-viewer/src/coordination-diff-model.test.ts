import { describe, it, expect } from 'vitest';
import type { CoordinationPipeline } from './coordination-types.js';
import { computeCoordinationDiff } from './coordination-diff-model.js';

function basePipeline(): CoordinationPipeline {
  return {
    name: 'kyc-pipeline',
    phases: [
      { type: 'step', action: 'agent-delegate', target: 'doc-classifier', model: 'sonnet-5' },
      { type: 'signal', name: 'docs-classified', description: 'fan-out' },
      {
        type: 'parallel',
        lanes: {
          'identity': [{ action: 'agent-delegate', target: 'id-extract' }],
          'financial': [{ action: 'agent-delegate', target: 'fin-extract' }],
          'address': [{ action: 'agent-delegate', target: 'addr-extract' }],
        },
      },
      { type: 'quorum', name: 'extraction-complete', required: 2, of: 3 },
      {
        type: 'step', action: 'agent-delegate', target: 'risk-assessor',
        model: 'opus-5', params: { 'descriptor': 'kyc-risk-decision' },
      },
    ],
  };
}

describe('computeCoordinationDiff', () => {
  it('marks all phases unchanged when pipelines are identical', () => {
    const result = computeCoordinationDiff(basePipeline(), basePipeline());
    expect(result.summary.unchanged).toBe(5);
    expect(result.summary.added).toBe(0);
    expect(result.summary.removed).toBe(0);
    expect(result.summary.modified).toBe(0);
    result.phases.forEach(p => expect(p.diff.status).toBe('unchanged'));
  });

  it('detects added agent in parallel lanes', () => {
    const newP = basePipeline();
    const parallel = newP.phases[2] as Extract<typeof newP.phases[number], { type: 'parallel' }>;
    parallel.lanes['pep-screener'] = [{ action: 'agent-delegate', target: 'pep-screen' }];
    const result = computeCoordinationDiff(basePipeline(), newP);
    const modified = result.phases.find(
      p => p.phase.type === 'parallel' && p.diff.status === 'modified',
    );
    expect(modified).toBeDefined();
    expect(modified!.diff.changes!.some(c => c.field === 'lane.pep-screener' && c.oldValue === undefined)).toBe(true);
    expect(result.summary.details).toContain('pep-screener added');
  });

  it('detects removed step', () => {
    const oldP = basePipeline();
    const newP = basePipeline();
    newP.phases = newP.phases.filter(
      p => !(p.type === 'step' && 'target' in p && p.target === 'doc-classifier'),
    );
    const result = computeCoordinationDiff(oldP, newP);
    const removed = result.phases.find(p => p.diff.status === 'removed');
    expect(removed).toBeDefined();
    expect(result.summary.removed).toBe(1);
    expect(result.summary.details).toContain('doc-classifier removed');
  });

  it('detects modified step params', () => {
    const newP = basePipeline();
    const riskStep = newP.phases[4] as Extract<typeof newP.phases[number], { type: 'step' }>;
    riskStep.params = { 'descriptor': 'kyc-risk-decision', 'params.pepResult': '${pep-screener.result}' };
    const result = computeCoordinationDiff(basePipeline(), newP);
    const modified = result.phases.find(
      p => p.diff.status === 'modified' && p.phase.type === 'step',
    );
    expect(modified).toBeDefined();
    expect(modified!.diff.changes!.some(c => c.field === 'params.params.pepResult')).toBe(true);
  });

  it('detects modified step model', () => {
    const newP = basePipeline();
    (newP.phases[0] as Extract<typeof newP.phases[number], { type: 'step' }>).model = 'opus-5';
    const result = computeCoordinationDiff(basePipeline(), newP);
    const modified = result.phases.find(p => p.diff.status === 'modified');
    expect(modified).toBeDefined();
    expect(modified!.diff.changes!.some(c => c.field === 'model')).toBe(true);
  });

  it('detects modified quorum values', () => {
    const newP = basePipeline();
    const quorum = newP.phases[3] as Extract<typeof newP.phases[number], { type: 'quorum' }>;
    quorum.required = 3;
    quorum.of = 4;
    const result = computeCoordinationDiff(basePipeline(), newP);
    const modified = result.phases.find(
      p => p.diff.status === 'modified' && p.phase.type === 'quorum',
    );
    expect(modified).toBeDefined();
    expect(modified!.diff.changes!.some(c => c.field === 'required' && c.oldValue === 2 && c.newValue === 3)).toBe(true);
    expect(modified!.diff.changes!.some(c => c.field === 'of' && c.oldValue === 3 && c.newValue === 4)).toBe(true);
  });

  it('generates human-readable summary details for quorum change', () => {
    const newP = basePipeline();
    const quorum = newP.phases[3] as Extract<typeof newP.phases[number], { type: 'quorum' }>;
    quorum.required = 3;
    quorum.of = 4;
    const result = computeCoordinationDiff(basePipeline(), newP);
    expect(result.summary.details.some(d => d.includes('2/3') && d.includes('3/4'))).toBe(true);
  });

  it('preserves pipeline name from new pipeline', () => {
    const oldP = basePipeline();
    const newP = basePipeline();
    newP.name = 'kyc-pipeline-v2';
    const result = computeCoordinationDiff(oldP, newP);
    expect(result.name).toBe('kyc-pipeline-v2');
  });
});
