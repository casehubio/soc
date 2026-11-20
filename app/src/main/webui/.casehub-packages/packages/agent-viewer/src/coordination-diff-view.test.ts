import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CoordinationPipeline } from './coordination-types.js';
import './coordination-diff-view.js';
import type { CoordinationDiffView } from './coordination-diff-view.js';

function oldPipeline(): CoordinationPipeline {
  return {
    name: 'kyc-pipeline',
    phases: [
      { type: 'step', action: 'agent-delegate', target: 'doc-classifier', model: 'sonnet-5' },
      { type: 'signal', name: 'docs-classified', description: 'fan-out to extractors' },
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

function newPipeline(): CoordinationPipeline {
  return {
    name: 'kyc-pipeline',
    phases: [
      { type: 'step', action: 'agent-delegate', target: 'doc-classifier', model: 'sonnet-5' },
      { type: 'signal', name: 'docs-classified', description: 'fan-out to extractors' },
      {
        type: 'parallel',
        lanes: {
          'identity': [{ action: 'agent-delegate', target: 'id-extract' }],
          'financial': [{ action: 'agent-delegate', target: 'fin-extract' }],
          'address': [{ action: 'agent-delegate', target: 'addr-extract' }],
          'pep-screener': [{ action: 'agent-delegate', target: 'pep-screen' }],
        },
      },
      { type: 'quorum', name: 'extraction-complete', required: 3, of: 4 },
      {
        type: 'step', action: 'agent-delegate', target: 'risk-assessor',
        model: 'opus-5',
        params: { 'descriptor': 'kyc-risk-decision', 'params.pepResult': '${pep-screener.result}' },
      },
    ],
  };
}

describe('coordination-diff-view', () => {
  let el: CoordinationDiffView;

  beforeEach(async () => {
    el = document.createElement('coordination-diff-view') as CoordinationDiffView;
    el.oldPipeline = oldPipeline();
    el.newPipeline = newPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders diff summary header', () => {
    const header = el.shadowRoot!.querySelector('.diff-summary');
    expect(header).toBeTruthy();
    expect(header!.textContent).toContain('kyc-pipeline');
  });

  it('renders diff stat entries', () => {
    const stats = el.shadowRoot!.querySelectorAll('.diff-stat');
    expect(stats.length).toBeGreaterThan(0);
  });

  it('renders modified nodes with amber styling', () => {
    const modified = el.shadowRoot!.querySelectorAll('.diff-modified');
    expect(modified.length).toBeGreaterThan(0);
  });

  it('renders MODIFIED badge on modified elements', () => {
    const badges = el.shadowRoot!.querySelectorAll('.diff-marker.modified');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders unchanged nodes with dimmed styling', () => {
    const unchanged = el.shadowRoot!.querySelectorAll('.diff-unchanged');
    expect(unchanged.length).toBeGreaterThan(0);
  });

  it('has correct ARIA attributes', () => {
    expect(el.getAttribute('role')).toBe('img');
    const label = el.getAttribute('aria-label');
    expect(label).toContain('Diff');
    expect(label).toContain('kyc-pipeline');
  });

  it('renders old and new quorum values for modified quorum', () => {
    const quorumEl = el.shadowRoot!.querySelector('.diff-quorum-change');
    expect(quorumEl).toBeTruthy();
    const text = quorumEl!.textContent;
    expect(text).toContain('2');
    expect(text).toContain('3');
  });

  it('returns nothing when no pipelines set', async () => {
    const empty = document.createElement('coordination-diff-view') as CoordinationDiffView;
    document.body.appendChild(empty);
    await empty.updateComplete;
    expect(empty.shadowRoot!.children.length).toBeLessThanOrEqual(1);
    empty.remove();
  });
});
