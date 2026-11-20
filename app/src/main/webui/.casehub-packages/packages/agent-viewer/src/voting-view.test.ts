import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import './voting-view.js';
import type { VotingView } from './voting-view.js';

function fixture(): DeliberationPatternCategory {
  return {
    category: 'deliberation',
    type: 'voting',
    name: 'proposal-evaluation',
    description: 'Three evaluators assess proposals',
    aggregation: { type: 'majority-vote' },
    termination: [{ type: 'single-pass' }],
    judgment: {
      trigger: { type: 'confidence-threshold', threshold: 0.7 },
      caller: { type: 'fan-out', callerNames: ['senior-reviewer', 'domain-lead'] },
    },
    failurePolicy: { routingFailureAction: 'fail', aggregationFailureAction: 'escalate' },
    agents: [
      { type: 'worker', name: 'quantitative-scorer', description: 'Statistical risk models', capabilities: ['risk-modelling'], model: 'claude-opus-5' },
      { type: 'worker', name: 'qualitative-reviewer', description: 'Contextual analysis', capabilities: ['contextual-analysis'], model: 'claude-sonnet-5' },
      { type: 'human', name: 'regulatory-checker', description: 'Compliance rules', capabilities: ['compliance-checking'] },
    ],
  };
}

describe('voting-view', () => {
  let el: VotingView;

  beforeEach(async () => {
    el = document.createElement('voting-view') as VotingView;
    el.pattern = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders pattern name in header', () => {
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('proposal-evaluation');
  });

  it('renders voting type badge', () => {
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('voting');
  });

  it('renders header metadata inline', () => {
    const meta = el.shadowRoot!.querySelector('.header-meta')?.textContent;
    expect(meta).toContain('majority-vote');
    expect(meta).toContain('single-pass');
    expect(meta).toContain('escalation on contested');
  });

  it('renders all agent cards', () => {
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });

  it('renders flow indicator between agents and aggregation', () => {
    const flow = el.shadowRoot!.querySelector('.flow-indicator');
    expect(flow).toBeTruthy();
    expect(flow!.querySelector('.flow-arrow')?.textContent).toBe('▼');
  });

  it('renders prominent aggregation card', () => {
    expect(el.shadowRoot!.querySelector('.aggregation-card')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.agg-strategy')?.textContent).toBe('MAJORITY VOTE');
  });

  it('renders aggregation threshold from judgment trigger', () => {
    expect(el.shadowRoot!.querySelector('.agg-detail')?.textContent).toContain('0.7');
  });

  it('renders termination specs', () => {
    expect(el.shadowRoot!.textContent).toContain('single-pass');
  });

  it('renders failure policy', () => {
    expect(el.shadowRoot!.textContent).toContain('fail');
    expect(el.shadowRoot!.textContent).toContain('escalate');
  });

  it('renders judgment card', () => {
    expect(el.shadowRoot!.querySelector('.judgment-card')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.judgment-type')?.textContent).toBe('FAN OUT');
  });

  it('renders judgment trigger details', () => {
    expect(el.shadowRoot!.querySelector('.judgment-detail')?.textContent).toContain('confidence-threshold');
    expect(el.shadowRoot!.querySelector('.judgment-detail')?.textContent).toContain('0.7');
  });

  it('renders judgment caller names', () => {
    expect(el.shadowRoot!.querySelector('.judgment-detail')?.textContent).toContain('senior-reviewer');
  });

  it('omits judgment when absent', async () => {
    el.pattern = { ...fixture(), judgment: undefined };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.judgment-card')).toBeNull();
  });

  it('renders AGREED outcome box', () => {
    const agreed = el.shadowRoot!.querySelector('.outcome-box.agreed');
    expect(agreed).toBeTruthy();
    expect(agreed?.textContent).toContain('decision');
  });

  it('renders CONTESTED outcome with escalation badges', () => {
    const contested = el.shadowRoot!.querySelector('.outcome-box.contested');
    expect(contested).toBeTruthy();
    expect(contested?.textContent).toContain('escalate to');
    const names = el.shadowRoot!.querySelectorAll('.escalation-name');
    expect(names.length).toBe(2);
    expect(names[0]?.textContent).toBe('senior-reviewer');
    expect(names[1]?.textContent).toBe('domain-lead');
  });

  it('omits outcomes when no judgment', async () => {
    el.pattern = { ...fixture(), judgment: undefined };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.outcomes')).toBeNull();
  });
});
