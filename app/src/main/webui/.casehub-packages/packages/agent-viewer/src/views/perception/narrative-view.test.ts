import { describe, it, expect, afterEach } from 'vitest';
import type { PerceptionPatternCategory } from '@casehubio/mosaic-core';
import './narrative-view.js';

function fixture(): PerceptionPatternCategory {
  return {
    category: 'perception',
    type: 'narrative',
    name: 'risk-narrative',
    description: 'Signals to step summaries to decision narratives',
    pipeline: {
      source: 'step.decision.completed',
      levels: [
        { grouping: 'windowed', summariser: { type: 'signal-collector' }, emit: 'signals.l0' },
        { grouping: 'keyed', summariser: { type: 'step-summariser' }, emit: 'summary.l1' },
        { grouping: 'keyed', summariser: { type: 'narrative-generator' }, emit: 'narrative.l2' },
      ],
    },
  };
}

describe('agency-perception-narrative-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-perception-narrative-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('perception view');
  });

  it('renders type badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('narrative');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('risk-narrative');
  });

  it('renders narrative pipeline label', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.narrative-label')?.textContent).toBe('Decision Narrative Pipeline');
  });

  it('renders source event', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.source-event')?.textContent).toBe('step.decision.completed');
  });

  it('renders three stage cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.stage-card').length).toBe(3);
  });

  it('renders stage labels L0/L1/L2', async () => {
    await create(fixture());
    const badges = el.shadowRoot!.querySelectorAll('.stage-badge');
    expect(badges[0].textContent).toBe('L0 Signals');
    expect(badges[1].textContent).toBe('L1 Summaries');
    expect(badges[2].textContent).toBe('L2 Narrative');
  });

  it('renders narrative output node', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.narrative-output')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.output-desc')?.textContent).toBe('Decision Narrative');
  });

  it('renders no-pipeline message when pipeline absent', async () => {
    await create({ category: 'perception', type: 'narrative' });
    expect(el.shadowRoot!.querySelector('.no-pipeline')).toBeTruthy();
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
