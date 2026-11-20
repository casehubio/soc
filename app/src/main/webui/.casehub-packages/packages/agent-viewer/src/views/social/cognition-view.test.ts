import { describe, it, expect, afterEach } from 'vitest';
import type { SocialPatternCategory } from '@casehubio/mosaic-core';
import './cognition-view.js';

function fixture(): SocialPatternCategory {
  return {
    category: 'social',
    type: 'cognition',
    name: 'agent-cognition',
    description: 'Full cognitive configuration for autonomous agent',
    cognition: {
      drive: {
        axisWeights: { curiosity: 0.8, affiliation: 0.6 },
        changeThreshold: 0.1,
        maxIntensity: 1.0,
        minIntensity: 0.0,
        moodPleasureModulation: 0.3,
      },
      mood: {
        baseline: { pleasure: 0.0, arousal: 0.0, dominance: 0.0 },
        decayTimeConstant: 'PT4H',
        maxDisplacement: 1.0,
        moodInfluence: 0.5,
        staleStateTimeout: 'PT24H',
      },
      retention: { retentionThreshold: 0.6, confidenceWeight: 0.4 },
      mentalModel: {
        beliefHalfLife: 'PT48H',
        confidenceFloor: 0.3,
        minSignalsForInference: 3,
      },
    },
  };
}

describe('agency-social-cognition-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-social-cognition-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('cognition');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('agent-cognition');
  });

  it('renders all 13 section cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.section-card').length).toBe(13);
  });

  it('marks configured sections as active', async () => {
    await create(fixture());
    const active = el.shadowRoot!.querySelectorAll('.section-card.active');
    expect(active.length).toBe(4);
  });

  it('renders ON/OFF status badges', async () => {
    await create(fixture());
    const onBadges = el.shadowRoot!.querySelectorAll('.status-active');
    const offBadges = el.shadowRoot!.querySelectorAll('.status-inactive');
    expect(onBadges.length).toBe(4);
    expect(offBadges.length).toBe(9);
  });

  it('renders typed config fields for active sections', async () => {
    await create(fixture());
    const fields = el.shadowRoot!.querySelectorAll('.config-field');
    expect(fields.length).toBeGreaterThan(0);
    const labels = Array.from(fields).map(f => f.querySelector('.field-label')?.textContent);
    expect(labels).toContain('decayTimeConstant');
    expect(labels).toContain('maxDisplacement');
  });

  it('renders drive axis weights', async () => {
    await create(fixture());
    const driveCard = Array.from(el.shadowRoot!.querySelectorAll('.section-card.active'))
      .find(c => c.querySelector('.section-name')?.textContent === 'Drive');
    expect(driveCard).toBeTruthy();
    expect(driveCard!.querySelector('.axis-weights')).toBeTruthy();
  });

  it('renders summary count', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.summary')?.textContent).toBe('4 of 13 cognitive modules configured');
  });

  it('renders no-cognition message when cognition absent', async () => {
    await create({ category: 'social', type: 'cognition' });
    expect(el.shadowRoot!.querySelector('.no-cognition')).toBeTruthy();
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

  it('Reports tab shows stub placeholder', async () => {
    await create(fixture());
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLElement).click();
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.empty-state')?.textContent).toBe('No report data available');
  });
});
