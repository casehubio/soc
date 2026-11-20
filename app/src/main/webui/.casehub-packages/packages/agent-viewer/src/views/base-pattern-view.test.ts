import { describe, it, expect, afterEach } from 'vitest';
import type { GovernancePatternCategory, CommunicationPatternCategory, SocialPatternCategory, PlaybookPatternCategory } from '@casehubio/mosaic-core';
import './base-pattern-view.js';

function governanceFixture(): GovernancePatternCategory {
  return {
    category: 'governance',
    type: 'oversight',
    name: 'deployment-gate',
    description: 'Reviews deployment readiness',
    agents: [
      { type: 'worker', name: 'compliance-checker', description: 'Verifies compliance rules', capabilities: ['compliance'] },
      { type: 'human', name: 'release-manager', description: 'Final approval' },
    ],
  };
}

describe('agency-base-pattern-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-base-pattern-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(governanceFixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('governance view');
  });

  it('renders type badge from spec.type', async () => {
    await create(governanceFixture());
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('oversight');
  });

  it('renders category badge', async () => {
    await create(governanceFixture());
    expect(el.shadowRoot!.querySelector('.category-badge')?.textContent).toBe('governance');
  });

  it('renders name', async () => {
    await create(governanceFixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('deployment-gate');
  });

  it('renders description', async () => {
    await create(governanceFixture());
    expect(el.shadowRoot!.textContent).toContain('Reviews deployment readiness');
  });

  it('renders agent cards', async () => {
    await create(governanceFixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(2);
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });

  it('works for communication types', async () => {
    const spec: CommunicationPatternCategory = { category: 'communication', type: 'channel-execution', name: 'support-channel' };
    await create(spec);
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('channel-execution');
    expect(el.shadowRoot!.querySelector('.category-badge')?.textContent).toBe('communication');
  });

  it('works for social/reflection type', async () => {
    const spec: SocialPatternCategory = { category: 'social', type: 'reflection', name: 'daily-reflection' };
    await create(spec);
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('reflection');
  });

  it('renders a playbook without an agents property', async () => {
    const spec: PlaybookPatternCategory = { category: 'playbook', type: 'sequence' };
    await create(spec);
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('sequence');
    expect(el.shadowRoot!.querySelector('.agents-grid')).toBeNull();
  });
});
