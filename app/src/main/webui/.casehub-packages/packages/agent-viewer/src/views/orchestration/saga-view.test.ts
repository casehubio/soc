import { describe, it, expect, afterEach } from 'vitest';
import type { OrchestrationPatternCategory } from '@casehubio/mosaic-core';
import './saga-view.js';

function fixture(): OrchestrationPatternCategory {
  return {
    category: 'orchestration',
    type: 'saga',
    name: 'order-fulfilment',
    description: 'Forward execution with compensating rollback on failure',
    routing: { type: 'sequential' },
    termination: [{ type: 'terminal-outcome' }],
    failurePolicy: {
      onRoutingFailure: 'FAIL',
      onDeadlock: 'FAIL',
      agentRetry: { maxRetries: 2, backoffStrategy: 'EXPONENTIAL', onExhausted: 'ESCALATE' },
    },
    agents: [
      { type: 'worker', name: 'reserve-inventory', description: 'Reserves inventory for the order', capabilities: ['inventory'] },
      { type: 'worker', name: 'charge-payment', description: 'Charges payment method', capabilities: ['payment'] },
      { type: 'worker', name: 'ship-order', description: 'Initiates shipping', capabilities: ['logistics'] },
    ],
  };
}

describe('agency-orchestration-saga-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-orchestration-saga-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('saga');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('order-fulfilment');
  });

  it('renders forward steps', async () => {
    await create(fixture());
    const steps = el.shadowRoot!.querySelectorAll('.saga-step');
    expect(steps.length).toBe(3);
  });

  it('renders compensation arrows', async () => {
    await create(fixture());
    const arrows = el.shadowRoot!.querySelectorAll('.compensation-arrow');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('renders retry policy', async () => {
    await create(fixture());
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('EXPONENTIAL');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
