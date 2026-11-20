import { describe, it, expect, afterEach } from 'vitest';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import './normative-view.js';

function fixture(): DeliberationPatternCategory {
  return {
    category: 'deliberation',
    type: 'normative',
    name: 'policy-arbitration',
    description: 'Resolves conflicts between competing policy rules through structured arbitration',
    maxRounds: 3,
    judge: {
      type: 'worker',
      name: 'policy-arbiter',
      description: 'Evaluates rule priorities and renders binding decisions',
      capabilities: ['rule-evaluation'],
      model: 'claude-opus-5',
    },
    termination: [{ type: 'all-agreed' }, { type: 'max-iterations' }],
    failurePolicy: { onRoutingFailure: 'FAIL', onDeadlock: 'ESCALATE' },
    agents: [
      { type: 'worker', name: 'compliance-advocate', description: 'Argues for compliance rules', capabilities: ['compliance'] },
      { type: 'worker', name: 'efficiency-advocate', description: 'Argues for operational efficiency', capabilities: ['optimisation'] },
    ],
  };
}

describe('agency-deliberation-normative-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-deliberation-normative-view');
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
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('normative');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('policy-arbitration');
  });

  it('renders agent cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(2);
  });

  it('renders arbiter section', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.arbiter-card')).toBeTruthy();
    expect(el.shadowRoot!.textContent).toContain('policy-arbiter');
  });

  it('renders max rounds', async () => {
    await create(fixture());
    expect(el.shadowRoot!.textContent).toContain('3');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
