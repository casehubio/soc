import { describe, it, expect, afterEach } from 'vitest';
import type { PerceptionPatternCategory } from '@casehubio/mosaic-core';
import './observation-view.js';

function fixture(): PerceptionPatternCategory {
  return {
    category: 'perception',
    type: 'observation',
    name: 'case-world-observer',
    description: 'Observes case entities with tiered rendering',
    world: {
      actions: ['inspect', 'query', 'monitor'],
      entities: { claim: { fields: ['amount', 'status'] } },
      sections: [
        { type: 'entity-group', requiredTags: ['active', 'priority'] },
        { type: 'text' },
        { type: 'item-list', resolutions: ['auto', 'manual'] },
      ],
      pipeline: ['extract', 'filter', 'rank'],
      renderer: { verbatimThreshold: 5, groupedThreshold: 20 },
    },
  };
}

describe('agency-perception-observation-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-perception-observation-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('observation');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('case-world-observer');
  });

  it('renders action tags', async () => {
    await create(fixture());
    const tags = el.shadowRoot!.querySelectorAll('.action-tag');
    expect(tags.length).toBe(3);
    expect(tags[0].textContent).toBe('inspect');
  });

  it('renders section cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.section-card').length).toBe(3);
  });

  it('renders section type badges', async () => {
    await create(fixture());
    const badges = el.shadowRoot!.querySelectorAll('.section-type-badge');
    expect(badges[0].textContent).toBe('entity-group');
  });

  it('renders required tags on sections', async () => {
    await create(fixture());
    const tags = el.shadowRoot!.querySelectorAll('.tag');
    expect(tags.length).toBe(2);
    expect(tags[0].textContent).toBe('active');
  });

  it('renders threshold bar', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.threshold-bar')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.zone-verbatim')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.zone-grouped')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.zone-summarised')).toBeTruthy();
  });

  it('renders pipeline steps', async () => {
    await create(fixture());
    const steps = el.shadowRoot!.querySelectorAll('.pipeline-step');
    expect(steps.length).toBe(3);
    expect(steps[0].textContent).toBe('extract');
  });

  it('renders no-world message when world absent', async () => {
    await create({ category: 'perception', type: 'observation' });
    expect(el.shadowRoot!.querySelector('.no-world')).toBeTruthy();
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
