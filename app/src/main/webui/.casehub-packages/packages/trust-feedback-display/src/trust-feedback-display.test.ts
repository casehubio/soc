import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './trust-feedback-display.js';
import type { GateDecision } from './types.js';

type TrustFeedbackDisplayEl = HTMLElement & {
  gateDecision: GateDecision | null;
  compact: boolean;
  updateComplete: Promise<boolean>;
};

const APPROVED_DECISION: GateDecision = {
  decision: 'APPROVED',
  actor: 'agent-alice',
  attestation: 'ENDORSED',
  trustScoreBefore: 0.72,
  trustScoreAfter: 0.85,
  dimension: 'clinical-trial-governance',
};

const REJECTED_DECISION: GateDecision = {
  decision: 'REJECTED',
  actor: 'agent-bob',
  attestation: 'OVERRULED',
  trustScoreBefore: 0.65,
  trustScoreAfter: 0.45,
  dimension: 'data-quality',
};

const NEUTRAL_DECISION: GateDecision = {
  decision: 'APPROVED',
  actor: 'agent-carol',
  attestation: 'ENDORSED',
  trustScoreBefore: 0.70,
  trustScoreAfter: 0.70,
  dimension: 'operational',
};

describe('agency-trust-feedback-display', () => {
  let el: TrustFeedbackDisplayEl;

  beforeEach(() => {
    el = document.createElement('agency-trust-feedback-display') as TrustFeedbackDisplayEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders no-data state when gateDecision is null', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No gate decision');
  });

  describe('full mode', () => {
    it('renders all card rows', async () => {
      el.gateDecision = APPROVED_DECISION;
      await el.updateComplete;
      const text = el.shadowRoot!.textContent!;
      expect(text).toContain('APPROVED');
      expect(text).toContain('agent-alice');
      expect(text).toContain('ENDORSED');
      expect(text).toContain('0.72');
      expect(text).toContain('0.85');
      expect(text).toContain('clinical-trial-governance');
    });

    it('renders region role with aria-label', async () => {
      el.gateDecision = APPROVED_DECISION;
      await el.updateComplete;
      const region = el.shadowRoot!.querySelector('[role="region"]');
      expect(region).toBeTruthy();
      expect(region!.getAttribute('aria-label')).toContain('Gate decision');
    });

    it('renders approved decision badge with correct class', async () => {
      el.gateDecision = APPROVED_DECISION;
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.decision-badge');
      expect(badge).toBeTruthy();
      expect(badge!.classList.contains('decision-badge--approved')).toBe(true);
    });

    it('renders rejected decision badge with correct class', async () => {
      el.gateDecision = REJECTED_DECISION;
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.decision-badge');
      expect(badge!.classList.contains('decision-badge--rejected')).toBe(true);
    });

    it('renders endorsed attestation badge', async () => {
      el.gateDecision = APPROVED_DECISION;
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.attestation-badge');
      expect(badge!.classList.contains('attestation-badge--endorsed')).toBe(true);
    });

    it('renders overruled attestation badge', async () => {
      el.gateDecision = REJECTED_DECISION;
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.attestation-badge');
      expect(badge!.classList.contains('attestation-badge--overruled')).toBe(true);
    });

    it('shows up arrow when score increases', async () => {
      el.gateDecision = APPROVED_DECISION;
      await el.updateComplete;
      const arrow = el.shadowRoot!.querySelector('.arrow--up');
      expect(arrow).toBeTruthy();
      expect(arrow!.textContent).toContain('↑');
    });

    it('shows down arrow when score decreases', async () => {
      el.gateDecision = REJECTED_DECISION;
      await el.updateComplete;
      const arrow = el.shadowRoot!.querySelector('.arrow--down');
      expect(arrow).toBeTruthy();
      expect(arrow!.textContent).toContain('↓');
    });

    it('shows neutral arrow when score unchanged', async () => {
      el.gateDecision = NEUTRAL_DECISION;
      await el.updateComplete;
      const arrow = el.shadowRoot!.querySelector('.arrow--neutral');
      expect(arrow).toBeTruthy();
      expect(arrow!.textContent).toContain('→');
    });

    it('uses actor field not investigator', async () => {
      el.gateDecision = APPROVED_DECISION;
      await el.updateComplete;
      const text = el.shadowRoot!.textContent!;
      expect(text).toContain('agent-alice');
      expect(text).not.toContain('investigator');
    });
  });

  describe('compact mode', () => {
    it('renders inline layout', async () => {
      el.gateDecision = APPROVED_DECISION;
      el.compact = true;
      await el.updateComplete;
      const compact = el.shadowRoot!.querySelector('.compact');
      expect(compact).toBeTruthy();
    });

    it('contains decision badge, actor, attestation, and score delta', async () => {
      el.gateDecision = APPROVED_DECISION;
      el.compact = true;
      await el.updateComplete;
      const text = el.shadowRoot!.textContent!;
      expect(text).toContain('APPROVED');
      expect(text).toContain('agent-alice');
      expect(text).toContain('ENDORSED');
      expect(text).toContain('0.72');
      expect(text).toContain('0.85');
    });
  });
});
