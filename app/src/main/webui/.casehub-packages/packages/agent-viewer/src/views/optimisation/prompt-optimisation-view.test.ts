import { describe, it, expect, afterEach } from 'vitest';
import type { OptimisationPatternCategory } from '@casehubio/mosaic-core';
import './prompt-optimisation-view.js';

function fixture(): OptimisationPatternCategory {
  return {
    category: 'optimisation',
    type: 'prompt-optimisation',
    name: 'risk-prompt-tuning',
    description: 'Optimises prompts for risk assessment tasks',
    pipelines: {
      'risk-assessment': {
        signature: { id: 'risk-v1', baseSystemPrompt: 'Assess risk factors for the given case' },
        optimiser: { type: 'few-shot', diversityStrategy: 'max-marginal' },
        config: { maxExamples: 10, minQualityThreshold: 0.7 },
        safety: { qualityFloor: 0.5, maxExperimentCycles: 50, circuitBreakerThreshold: 0.3 },
        confidenceScorer: { type: 'composite' },
        examples: [
          { input: 'case-1', output: 'high-risk', outcome: 'correct', qualityScore: 0.9 },
          { input: 'case-2', output: 'low-risk', outcome: 'correct', qualityScore: 0.8 },
        ],
      },
      'triage': {
        signature: { id: 'triage-v2' },
        optimiser: { type: 'instruction' },
      },
    },
  };
}

describe('agency-optimisation-prompt-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-optimisation-prompt-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('optimisation view');
  });

  it('renders type badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('prompt-optimisation');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('risk-prompt-tuning');
  });

  it('renders pipeline cards for each pipeline', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.pipeline-card').length).toBe(2);
  });

  it('renders pipeline names', async () => {
    await create(fixture());
    const names = el.shadowRoot!.querySelectorAll('.pipeline-name');
    expect(names[0].textContent).toBe('risk-assessment');
    expect(names[1].textContent).toBe('triage');
  });

  it('renders optimiser badge', async () => {
    await create(fixture());
    const badges = el.shadowRoot!.querySelectorAll('.optimiser-badge');
    expect(badges[0].textContent).toBe('few-shot');
  });

  it('renders diversity strategy badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.diversity-badge')?.textContent).toBe('max-marginal');
  });

  it('renders signature section', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.signature-id')?.textContent).toBe('risk-v1');
  });

  it('renders base system prompt', async () => {
    await create(fixture());
    const prompt = el.shadowRoot!.querySelector('.signature-prompt');
    expect(prompt?.textContent).toContain('Assess risk factors');
  });

  it('renders config cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.config-card').length).toBe(2);
  });

  it('renders safety guardrails', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.safety-card').length).toBe(3);
  });

  it('renders confidence scorer badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.scorer-badge')?.textContent).toBe('scorer: composite');
  });

  it('renders examples count', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.examples-count')?.textContent).toBe('2 training examples');
  });

  it('renders no-pipelines message when pipelines absent', async () => {
    await create({ category: 'optimisation', type: 'prompt-optimisation' });
    expect(el.shadowRoot!.querySelector('.no-pipelines')).toBeTruthy();
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });

  it('renders tablist with Execution and Reports tabs', async () => {
    await create(fixture());
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent?.trim()).toBe('Execution');
    expect(tabs[1].textContent?.trim()).toBe('Reports');
  });

  it('renders execution content by default', async () => {
    await create(fixture());
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]');
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('id')).toBe('panel-execution');
  });

  it('Reports tab shows stub placeholder', async () => {
    await create(fixture());
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLElement).click();
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.empty-state')?.textContent).toBe('No report data available');
  });
});
