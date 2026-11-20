import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './sla-breach-policy.js';
import type { TierDefinition } from './types.js';

type SlaBreachPolicyEl = HTMLElement & {
  tiers: TierDefinition[];
  timeRemaining: number;
  deadline: string;
  updateComplete: Promise<boolean>;
};

const SAMPLE_TIERS: TierDefinition[] = [
  { threshold: 0.75, label: 'Warning', consequence: 'Notification sent to team lead' },
  { threshold: 0.50, label: 'Escalation L1', consequence: 'Auto-assign to senior agent', regulation: 'SLA Policy §3.1' },
  { threshold: 0.25, label: 'Escalation L2', consequence: 'Manager notification and priority override' },
  { threshold: 0.0, label: 'Breach', consequence: 'Compliance report generated' },
];

function getStylesText(el: HTMLElement): string {
  const styleTags = el.shadowRoot!.querySelectorAll('style');
  return Array.from(styleTags).map(s => s.textContent ?? '').join(' ');
}

describe('agency-sla-breach-policy', () => {
  let el: SlaBreachPolicyEl;

  beforeEach(() => {
    el = document.createElement('agency-sla-breach-policy') as SlaBreachPolicyEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no tiers', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No breach policy tiers');
  });

  it('renders all tiers', async () => {
    el.tiers = SAMPLE_TIERS;
    await el.updateComplete;
    const tiers = el.shadowRoot!.querySelectorAll('[role="listitem"]');
    expect(tiers.length).toBe(4);
  });

  it('renders tier labels and consequences', async () => {
    el.tiers = SAMPLE_TIERS;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Warning');
    expect(text).toContain('Notification sent to team lead');
    expect(text).toContain('Escalation L1');
    expect(text).toContain('Auto-assign to senior agent');
  });

  it('renders threshold as percentage', async () => {
    el.tiers = SAMPLE_TIERS;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('75%');
    expect(text).toContain('50%');
  });

  it('renders optional regulation text', async () => {
    el.tiers = SAMPLE_TIERS;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('SLA Policy §3.1');
  });

  it('highlights active tier based on timeRemaining', async () => {
    el.tiers = SAMPLE_TIERS;
    el.timeRemaining = 40;
    await el.updateComplete;
    const activeTiers = el.shadowRoot!.querySelectorAll('.tier--active');
    expect(activeTiers.length).toBe(1);
    expect(activeTiers[0]!.textContent).toContain('Escalation L1');
  });

  it('has role="list" on container', async () => {
    el.tiers = SAMPLE_TIERS;
    await el.updateComplete;
    const list = el.shadowRoot!.querySelector('[role="list"]');
    expect(list).toBeTruthy();
  });

  it('renders embedded sla-indicator when deadline is set', async () => {
    el.tiers = SAMPLE_TIERS;
    el.deadline = new Date(Date.now() + 3600000).toISOString();
    await el.updateComplete;
    const indicator = el.shadowRoot!.querySelector('agency-sla-indicator');
    expect(indicator).toBeTruthy();
  });

  it('does not render sla-indicator when no deadline', async () => {
    el.tiers = SAMPLE_TIERS;
    await el.updateComplete;
    const indicator = el.shadowRoot!.querySelector('agency-sla-indicator');
    expect(indicator).toBeFalsy();
  });

  it('active tier background uses theme token, not hardcoded light colour', () => {
    const css = getStylesText(el);
    expect(css).toContain('.tier--active');
    expect(css).not.toContain('#fff7ed');
  });

  it('active tier label uses theme token, not hardcoded dark-on-light colour', () => {
    const css = getStylesText(el);
    expect(css).not.toContain('#9a3412');
  });

  it('active tier box-shadow uses no hardcoded oklch values', () => {
    const css = getStylesText(el);
    expect(css).not.toContain('oklch');
  });
});
