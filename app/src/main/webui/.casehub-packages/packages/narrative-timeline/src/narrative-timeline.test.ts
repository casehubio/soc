import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './narrative-timeline.js';
import type { StepDecisionSummary } from './types.js';

type NarrativeTimelineElement = HTMLElement & {
  emptyMessage: string;
  loading: boolean;
  error: unknown;
  updateComplete: Promise<boolean>;
  _steps: StepDecisionSummary[];
  _explanation: string;
};

const STEP: StepDecisionSummary = {
  caseId: 'case-42',
  stepName: 'Risk review',
  from: '2026-10-01T12:00:00Z',
  to: '2026-10-01T12:05:00Z',
  signals: [
    {
      signalType: 'TRUST',
      summary: 'Manual review confirmed the account owner',
      keyFacts: { reviewer: 'Analyst', outcome: 'approved' },
      confidence: 0.85,
    },
  ],
};

describe('agency-narrative-timeline', () => {
  let el: NarrativeTimelineElement;

  beforeEach(() => {
    el = document.createElement('agency-narrative-timeline') as NarrativeTimelineElement;
    document.body.appendChild(el);
  });

  afterEach(() => el.remove());

  it('renders its configurable empty state', async () => {
    el.emptyMessage = 'Nothing to explain yet';
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('Nothing to explain yet');
  });

  it('renders the narrative explanation, step, signal, and facts', async () => {
    el._explanation = 'The case was approved after a trust review.';
    el._steps = [STEP];
    await el.updateComplete;

    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('The case was approved after a trust review.');
    expect(text).toContain('Risk review');
    expect(text).toContain('TRUST');
    expect(text).toContain('Manual review confirmed the account owner');
    expect(text).toContain('reviewer:');
    expect(text).toContain('Analyst');
    expect(el.shadowRoot!.querySelector('.confidence-fill')?.getAttribute('style'))
      .toContain('width: 85%');
  });

  it('renders loading and error states', async () => {
    el.loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Loading narrative');

    el.loading = false;
    el.error = new Error('offline');
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Narrative data unavailable');
  });
});
