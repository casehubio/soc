import { describe, it, expect, afterEach } from 'vitest';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import './coalition-view.js';

function fixture(): DeliberationPatternCategory {
  return {
    category: 'deliberation',
    type: 'coalition',
    name: 'incident-response-team',
    description: 'Forms a coalition covering all required capabilities for incident response',
    aggregation: { type: 'collect-all' },
    termination: [{ type: 'goal-reached' }],
    failurePolicy: { onRoutingFailure: 'RETRY_BROADER', onDeadlock: 'ESCALATE' },
    agents: [
      { type: 'worker', name: 'security-analyst', description: 'Threat analysis and forensics', capabilities: ['threat-analysis', 'forensics'] },
      { type: 'worker', name: 'network-engineer', description: 'Network isolation and recovery', capabilities: ['networking', 'firewall'] },
      { type: 'worker', name: 'comms-lead', description: 'Stakeholder communication', capabilities: ['communication', 'reporting'] },
    ],
  };
}

describe('agency-deliberation-coalition-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-deliberation-coalition-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('coalition');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('incident-response-team');
  });

  it('renders agent cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });

  it('renders capability coverage section', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.capability-grid')).toBeTruthy();
  });

  it('renders capability tags from agents', async () => {
    await create(fixture());
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('threat-analysis');
    expect(text).toContain('networking');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
