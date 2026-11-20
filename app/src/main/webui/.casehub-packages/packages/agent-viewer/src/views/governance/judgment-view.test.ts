import { describe, it, expect, afterEach } from 'vitest';
import type { GovernancePatternCategory } from '@casehubio/mosaic-core';
import './judgment-view.js';

function fixture(): GovernancePatternCategory {
  return {
    category: 'governance',
    type: 'judgment',
    name: 'deployment-approval',
    description: 'Multi-level judgment gate for production deployments with escalation chain',
    agents: [
      { type: 'worker', name: 'risk-assessor', description: 'Evaluates deployment risk', capabilities: ['risk-assessment'] },
      { type: 'worker', name: 'security-reviewer', description: 'Reviews security posture', capabilities: ['security-review'] },
      { type: 'human', name: 'release-authority', description: 'Final human approval authority' },
    ],
    failurePolicy: { onRoutingFailure: 'FAIL', onDeadlock: 'ESCALATE' },
  };
}

describe('agency-governance-judgment-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-governance-judgment-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('governance view');
  });

  it('renders category and type badges', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.category-badge')?.textContent).toBe('governance');
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('judgment');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('deployment-approval');
  });

  it('renders agent cards in escalation chain', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });

  it('renders escalation flow indicators', async () => {
    await create(fixture());
    const arrows = el.shadowRoot!.querySelectorAll('.escalation-arrow');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
