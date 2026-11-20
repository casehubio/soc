import { describe, it, expect, afterEach } from 'vitest';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import './negotiation-view.js';

function fixture(): DeliberationPatternCategory {
  return {
    category: 'deliberation',
    type: 'negotiation',
    name: 'contract-terms',
    description: 'Agents negotiate contract terms through proposals and counter-proposals',
    maxRounds: 5,
    termination: [{ type: 'accepted' }, { type: 'max-iterations' }],
    failurePolicy: { onRoutingFailure: 'FAIL', onDeadlock: 'ESCALATE' },
    parties: [
      { name: 'buyer-agent', role: 'buyer' },
      { name: 'seller-agent', role: 'seller' },
    ],
    acceptance: { type: 'unanimous' },
  };
}

describe('agency-deliberation-negotiation-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-deliberation-negotiation-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('deliberation view');
  });

  it('renders type badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('negotiation');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('contract-terms');
  });

  it('renders party cards with names', async () => {
    await create(fixture());
    const names = el.shadowRoot!.querySelectorAll('.party-name');
    expect(names.length).toBe(2);
    expect(names[0].textContent).toBe('buyer-agent');
    expect(names[1].textContent).toBe('seller-agent');
  });

  it('renders party roles', async () => {
    await create(fixture());
    const roles = el.shadowRoot!.querySelectorAll('.party-role');
    expect(roles.length).toBe(2);
    expect(roles[0].textContent).toBe('buyer');
  });

  it('renders exchange icon between two parties', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.exchange-icon')?.textContent).toBe('⇄');
  });

  it('renders acceptance policy', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.acceptance-type')?.textContent).toBe('unanimous');
  });

  it('renders threshold value for threshold acceptance', async () => {
    const spec = { ...fixture(), acceptance: { type: 'threshold' as const, value: 0.75 } };
    await create(spec);
    expect(el.shadowRoot!.querySelector('.acceptance-threshold')?.textContent).toBe('≥ 0.75');
  });

  it('renders max rounds in metadata', async () => {
    await create(fixture());
    expect(el.shadowRoot!.textContent).toContain('5');
  });

  it('renders outcome section', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.outcome-section')).toBeTruthy();
  });

  it('falls back to agent-card when parties absent', async () => {
    const spec: DeliberationPatternCategory = {
      category: 'deliberation',
      type: 'negotiation',
      agents: [{ type: 'worker', name: 'agent-a' }],
    };
    await create(spec);
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(1);
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
