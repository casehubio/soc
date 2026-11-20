import { describe, it, expect, afterEach } from 'vitest';
import type { OrchestrationPatternCategory } from '@casehubio/mosaic-core';
import './choreography-view.js';

function fixture(): OrchestrationPatternCategory {
  return {
    category: 'orchestration',
    type: 'choreography',
    name: 'incident-blackboard',
    description: 'Agents react to shared blackboard state changes — no central controller',
    activation: { type: 'on-dispatch' },
    aggregation: { type: 'collect-all' },
    termination: [{ type: 'convergence' }, { type: 'max-iterations' }],
    failurePolicy: { onRoutingFailure: 'FAIL', onDeadlock: 'ESCALATE' },
    agents: [
      { type: 'worker', name: 'threat-detector', description: 'Monitors for security threats', capabilities: ['threat-detection'] },
      { type: 'worker', name: 'impact-assessor', description: 'Assesses blast radius', capabilities: ['impact-analysis'] },
      { type: 'worker', name: 'remediation-planner', description: 'Plans remediation steps', capabilities: ['remediation'] },
    ],
  };
}

describe('agency-orchestration-choreography-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-orchestration-choreography-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('choreography');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('incident-blackboard');
  });

  it('renders activation badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.activation-badge')?.textContent).toContain('on-dispatch');
  });

  it('renders agent cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });

  it('renders shared state indicator', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.blackboard')).toBeTruthy();
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
