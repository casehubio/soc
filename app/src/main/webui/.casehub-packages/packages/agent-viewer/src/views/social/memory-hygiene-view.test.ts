import { describe, it, expect, afterEach } from 'vitest';
import type { SocialPatternCategory } from '@casehubio/mosaic-core';
import './memory-hygiene-view.js';

function fixture(): SocialPatternCategory {
  return {
    category: 'social',
    type: 'memory-hygiene',
    name: 'memory-cleanup',
    description: 'Confidence-weighted memory eviction',
    retention: {
      retentionThreshold: 0.5,
      confidenceWeight: 0.3,
      recencyWeight: 0.3,
      scopeWeight: 0.2,
      trustWeight: 0.2,
    },
  };
}

describe('agency-social-memory-hygiene-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-social-memory-hygiene-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('social view');
  });

  it('renders type badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('memory-hygiene');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('memory-cleanup');
  });

  it('renders retention threshold', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.threshold-value')?.textContent).toBe('0.5');
  });

  it('renders weight bars for all four weights', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.weight-row').length).toBe(4);
  });

  it('renders weight names', async () => {
    await create(fixture());
    const names = el.shadowRoot!.querySelectorAll('.weight-name');
    expect(names[0].textContent).toBe('Confidence');
    expect(names[1].textContent).toBe('Recency');
    expect(names[2].textContent).toBe('Scope');
    expect(names[3].textContent).toBe('Trust');
  });

  it('renders weight values', async () => {
    await create(fixture());
    const values = el.shadowRoot!.querySelectorAll('.weight-value');
    expect(values[0].textContent).toBe('0.3');
    expect(values[3].textContent).toBe('0.2');
  });

  it('falls back to cognition.retention when retention is absent', async () => {
    const spec: SocialPatternCategory = {
      category: 'social',
      type: 'memory-hygiene',
      cognition: {
        retention: { retentionThreshold: 0.7, confidenceWeight: 0.5 },
      },
    };
    await create(spec);
    expect(el.shadowRoot!.querySelector('.threshold-value')?.textContent).toBe('0.7');
  });

  it('renders no-retention message when retention absent', async () => {
    await create({ category: 'social', type: 'memory-hygiene' });
    expect(el.shadowRoot!.querySelector('.no-retention')).toBeTruthy();
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
