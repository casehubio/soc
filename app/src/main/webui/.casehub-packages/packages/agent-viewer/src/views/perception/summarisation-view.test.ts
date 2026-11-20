import { describe, it, expect, afterEach } from 'vitest';
import type { PerceptionPatternCategory } from '@casehubio/mosaic-core';
import './summarisation-view.js';

function fixture(): PerceptionPatternCategory {
  return {
    category: 'perception',
    type: 'summarisation',
    name: 'document-summariser',
    description: 'Multi-level document summarisation pipeline',
    pipeline: {
      source: 'case.document.updated',
      levels: [
        { grouping: 'windowed', summariser: { type: 'extractive' }, emit: 'summary.l1' },
        { grouping: 'keyed', summariser: { type: 'llm', config: { model: 'claude-sonnet' } }, emit: 'summary.l2' },
      ],
    },
  };
}

describe('agency-perception-summarisation-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-perception-summarisation-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('summarisation');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('document-summariser');
  });

  it('renders source event', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.source-event')?.textContent).toBe('case.document.updated');
  });

  it('renders pipeline levels', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.level-card').length).toBe(2);
  });

  it('renders level details', async () => {
    await create(fixture());
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('extractive');
    expect(text).toContain('summary.l1');
    expect(text).toContain('windowed');
  });

  it('renders grouping badges', async () => {
    await create(fixture());
    const badges = el.shadowRoot!.querySelectorAll('.grouping-badge');
    expect(badges.length).toBe(2);
    expect(badges[0].textContent).toBe('windowed');
    expect(badges[1].textContent).toBe('keyed');
  });

  it('renders no-pipeline message when pipeline absent', async () => {
    await create({ category: 'perception', type: 'summarisation' });
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
