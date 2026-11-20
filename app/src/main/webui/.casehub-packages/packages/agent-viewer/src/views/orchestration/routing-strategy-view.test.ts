import { describe, it, expect, afterEach } from 'vitest';
import type { RoutingSpec, AgentRefSpec, GovernanceSpec, RoutingAgentStatus } from '@casehubio/mosaic-core';
import './routing-strategy-view.js';

const AGENTS: AgentRefSpec[] = [
  { type: 'worker', name: 'risk-analyst', description: 'Evaluates risk', capabilities: ['risk-assessment'] },
  { type: 'worker', name: 'compliance-check', description: 'Checks compliance', capabilities: ['compliance'] },
  { type: 'human', name: 'senior-reviewer', description: 'Escalation target' },
];

describe('agency-routing-strategy-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(props: {
    routing: RoutingSpec;
    agents?: AgentRefSpec[];
    governance?: GovernanceSpec;
    agentStatuses?: Record<string, RoutingAgentStatus>;
  }) {
    el = document.createElement('agency-routing-strategy-view');
    Object.assign(el, props);
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label with strategy type', async () => {
    await create({ routing: { type: 'first-match' } });
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('routing strategy: first-match');
  });

  it('renders empty state when no routing', async () => {
    el = document.createElement('agency-routing-strategy-view');
    document.body.appendChild(el);
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });

  it('renders strategy type badge', async () => {
    await create({ routing: { type: 'first-match' } });
    expect(el.shadowRoot!.querySelector('[data-strategy-badge]')?.textContent).toContain('first-match');
  });

  it('renders first-match guard expression when present', async () => {
    await create({ routing: { type: 'first-match', guard: 'hasCapability("analysis")' }, agents: AGENTS });
    expect(el.shadowRoot!.textContent).toContain('hasCapability("analysis")');
  });

  it('renders agent cards when agents provided', async () => {
    await create({ routing: { type: 'first-match' }, agents: AGENTS });
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });

  it('applies runtime status borders to agent cards', async () => {
    await create({
      routing: { type: 'first-match' },
      agents: AGENTS,
      agentStatuses: { 'risk-analyst': 'selected', 'compliance-check': 'skipped', 'senior-reviewer': 'not-evaluated' },
    });
    const wrappers = el.shadowRoot!.querySelectorAll('[data-agent-status]');
    expect(wrappers.length).toBe(3);
    const statuses = Array.from(wrappers).map(w => w.getAttribute('data-agent-status'));
    expect(statuses).toContain('selected');
    expect(statuses).toContain('skipped');
    expect(statuses).toContain('not-evaluated');
  });

  describe('round-robin strategy', () => {
    it('renders numbered cycle indicators', async () => {
      await create({ routing: { type: 'round-robin' }, agents: AGENTS });
      const positions = el.shadowRoot!.querySelectorAll('[data-cycle-position]');
      expect(positions.length).toBe(3);
    });

    it('renders rotation indicator', async () => {
      await create({ routing: { type: 'round-robin' }, agents: AGENTS });
      expect(el.shadowRoot!.querySelector('[data-rotation-indicator]')).toBeTruthy();
    });
  });

  describe('sequential strategy', () => {
    it('renders numbered chain', async () => {
      await create({ routing: { type: 'sequential' }, agents: AGENTS });
      const steps = el.shadowRoot!.querySelectorAll('[data-seq-step]');
      expect(steps.length).toBe(3);
    });

    it('renders one-shot badge', async () => {
      await create({ routing: { type: 'sequential' }, agents: AGENTS });
      expect(el.shadowRoot!.textContent).toContain('one-shot');
    });
  });

  describe('select-all strategy', () => {
    it('renders all agents with fan-out indicator', async () => {
      await create({ routing: { type: 'select-all' }, agents: AGENTS });
      expect(el.shadowRoot!.querySelector('[data-fanout-hub]')).toBeTruthy();
      expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
    });
  });

  describe('llm-selected strategy', () => {
    it('renders LLM decision node with model badge', async () => {
      await create({ routing: { type: 'llm-selected', model: 'claude-sonnet-5-5' }, agents: AGENTS });
      expect(el.shadowRoot!.querySelector('[data-llm-node]')).toBeTruthy();
      expect(el.shadowRoot!.textContent).toContain('claude-sonnet-5-5');
    });

    it('renders prompt preview when present', async () => {
      await create({ routing: { type: 'llm-selected', prompt: 'Select the best risk analyst' }, agents: AGENTS });
      expect(el.shadowRoot!.textContent).toContain('Select the best risk analyst');
    });
  });

  describe('cbr-agent strategy', () => {
    it('renders CBR node with similarity threshold', async () => {
      await create({ routing: { type: 'cbr-agent', similarityThreshold: 0.85 }, agents: AGENTS });
      expect(el.shadowRoot!.querySelector('[data-cbr-node]')).toBeTruthy();
      expect(el.shadowRoot!.textContent).toContain('85%');
    });
  });

  describe('disposition-aware strategy', () => {
    it('renders disposition axis weight bars', async () => {
      await create({
        routing: {
          type: 'disposition-aware',
          axes: [
            { axis: 'openness', weight: 0.7 },
            { axis: 'conscientiousness', weight: 0.3 },
          ],
        },
        agents: AGENTS,
      });
      const bars = el.shadowRoot!.querySelectorAll('[data-axis-bar]');
      expect(bars.length).toBe(2);
      expect(el.shadowRoot!.textContent).toContain('openness');
      expect(el.shadowRoot!.textContent).toContain('conscientiousness');
    });
  });

  describe('governance policy section', () => {
    it('renders trust routing policy when governance provided', async () => {
      await create({
        routing: { type: 'first-match' },
        agents: AGENTS,
        governance: {
          trustRouting: { threshold: 0.7, borderlineMargin: 0.1, blendFactor: 0.6, minimumObservations: 5 },
        },
      });
      expect(el.shadowRoot!.querySelector('.policy-section')).toBeTruthy();
      expect(el.shadowRoot!.textContent).toContain('70%');
      expect(el.shadowRoot!.textContent).toContain('±10%');
      expect(el.shadowRoot!.textContent).toContain('60% trust');
    });

    it('renders CBR routing policy when governance provided', async () => {
      await create({
        routing: { type: 'cbr-agent' },
        agents: AGENTS,
        governance: {
          cbrRouting: { successWeight: 1.0, gateExpiredWeight: 0.5, gateRejectedWeight: -0.5, failureWeight: -1.0 },
        },
      });
      expect(el.shadowRoot!.querySelector('.cbr-policy')).toBeTruthy();
      expect(el.shadowRoot!.textContent).toContain('Success');
      expect(el.shadowRoot!.textContent).toContain('Failure');
    });

    it('hides policy section when no governance', async () => {
      await create({ routing: { type: 'first-match' }, agents: AGENTS });
      expect(el.shadowRoot!.querySelector('.policy-section')).toBeFalsy();
    });
  });

  it('falls back to generic layout for unknown strategy type', async () => {
    await create({ routing: { type: 'custom-strategy' } as any, agents: AGENTS });
    expect(el.shadowRoot!.querySelector('[data-strategy-badge]')?.textContent).toContain('custom-strategy');
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });
});
