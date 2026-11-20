import { describe, it, expect, afterEach } from 'vitest';
import type { OrchestrationPatternCategory } from '@casehubio/mosaic-core';
import './supervisor-view.js';

function fixture(): OrchestrationPatternCategory {
  return {
    category: 'orchestration',
    type: 'supervisor',
    name: 'kyc-supervisor',
    description: 'Central supervisor routes verification tasks to specialist workers',
    routing: { type: 'llm-selected' },
    aggregation: { type: 'collect-all' },
    termination: [{ type: 'goal-reached' }, { type: 'max-iterations' }],
    failurePolicy: { onRoutingFailure: 'RETRY_BROADER', onDeadlock: 'ESCALATE' },
    agents: [
      { type: 'worker', name: 'identity-verifier', description: 'Verifies identity documents', capabilities: ['identity-verification'] },
      { type: 'worker', name: 'financial-checker', description: 'Checks financial records', capabilities: ['financial-analysis'] },
      { type: 'human', name: 'senior-reviewer', description: 'Escalation target for edge cases' },
    ],
  };
}

describe('agency-orchestration-supervisor-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-orchestration-supervisor-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('orchestration view');
  });

  it('renders category and type badges', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.category-badge')?.textContent).toBe('orchestration');
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('supervisor');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('kyc-supervisor');
  });

  it('renders description', async () => {
    await create(fixture());
    expect(el.shadowRoot!.textContent).toContain('Central supervisor routes verification tasks');
  });

  it('renders routing strategy view component', async () => {
    await create(fixture());
    const routingView = el.shadowRoot!.querySelector('agency-routing-strategy-view');
    expect(routingView).toBeTruthy();
    expect((routingView as any).routing).toEqual({ type: 'llm-selected' });
  });

  it('passes agents to routing strategy view', async () => {
    await create(fixture());
    const routingView = el.shadowRoot!.querySelector('agency-routing-strategy-view') as any;
    expect(routingView).toBeTruthy();
    expect(routingView.agents).toHaveLength(3);
  });

  it('renders aggregation card', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.aggregation-card')).toBeTruthy();
    expect(el.shadowRoot!.textContent).toContain('COLLECT ALL');
  });

  it('renders termination metadata', async () => {
    await create(fixture());
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('goal-reached');
    expect(text).toContain('max-iterations');
  });

  it('renders failure policy', async () => {
    await create(fixture());
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('RETRY_BROADER');
    expect(text).toContain('ESCALATE');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
