import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import './debate-view.js';
import type { DebateView } from './debate-view.js';

function fixture(): DeliberationPatternCategory {
  return {
    category: 'deliberation',
    type: 'debate',
    name: 'adversarial-review',
    description: 'Structured adversarial debate',
    maxRounds: 7,
    judge: { type: 'worker', name: 'arbiter', description: 'Evaluates arguments', capabilities: ['argument-evaluation'] },
    termination: [
      { type: 'all-agreed', resolvedStatuses: ['RESOLVED', 'ACCEPTED'] },
      { type: 'max-iterations', iterations: 14 },
    ],
    failurePolicy: { routingFailureAction: 'fail', aggregationFailureAction: 'escalate' },
    agents: [
      { type: 'worker', name: 'proponent', description: 'Argues in favour', capabilities: ['argumentation'] },
      { type: 'worker', name: 'opponent', description: 'Challenges the position', capabilities: ['critical-analysis'] },
    ],
  };
}

describe('debate-view', () => {
  let el: DebateView;

  beforeEach(async () => {
    el = document.createElement('debate-view') as DebateView;
    el.pattern = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders pattern name', () => {
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('adversarial-review');
  });

  it('renders debate type badge', () => {
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('debate');
  });

  it('renders description', () => {
    expect(el.shadowRoot!.querySelector('.header-desc')?.textContent).toContain('adversarial debate');
  });

  it('renders debaters with versus indicator', () => {
    expect(el.shadowRoot!.querySelectorAll('.debater-name').length).toBe(2);
    expect(el.shadowRoot!.querySelector('.versus')?.textContent).toBe('⇌');
  });

  it('renders debater descriptions as roles', () => {
    const roles = el.shadowRoot!.querySelectorAll('.debater-role');
    expect(roles.length).toBe(2);
    expect(roles[0]?.textContent).toContain('Argues in favour');
  });

  it('renders judge card', () => {
    expect(el.shadowRoot!.querySelector('.judge-label')?.textContent).toBe('arbiter');
  });

  it('renders judge description', () => {
    expect(el.shadowRoot!.querySelector('.judge-detail')?.textContent).toContain('Evaluates arguments');
  });

  it('renders round structure from agents and maxRounds', () => {
    const entries = el.shadowRoot!.querySelectorAll('.round-entry');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.querySelector('.round-speaker')?.textContent).toBe('proponent');
    expect(entries[1]?.querySelector('.round-speaker')?.textContent).toBe('opponent');
  });

  it('renders rounds ellipsis with termination', () => {
    expect(el.shadowRoot!.querySelector('.rounds-ellipsis')?.textContent).toContain('max 7 rounds');
    expect(el.shadowRoot!.querySelector('.rounds-ellipsis')?.textContent).toContain('convergence');
  });

  it('renders termination specs', () => {
    expect(el.shadowRoot!.textContent).toContain('all-agreed');
    expect(el.shadowRoot!.textContent).toContain('RESOLVED');
  });

  it('renders failure policy', () => {
    expect(el.shadowRoot!.textContent).toContain('fail');
    expect(el.shadowRoot!.textContent).toContain('escalate');
  });

  it('renders judge model badge when present', async () => {
    el.pattern = { ...fixture(), judge: { type: 'worker', name: 'arbiter', model: 'claude-opus-5' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.judge-model')?.textContent).toBe('claude-opus-5');
  });

  it('omits judge when absent', async () => {
    el.pattern = { ...fixture(), judge: undefined };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.judge-card')).toBeNull();
  });
});
