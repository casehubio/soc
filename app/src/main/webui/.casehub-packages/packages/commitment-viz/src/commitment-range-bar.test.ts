import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CommitmentState } from '@casehubio/mosaic-core';
import './commitment-range-bar.js';

type BarEl = HTMLElement & {
  state: CommitmentState;
  createdAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  deadline?: string;
  mode: 'compact' | 'detailed';
  updateComplete: Promise<boolean>;
};

describe('commitment-range-bar', () => {
  let el: BarEl;

  beforeEach(async () => {
    el = document.createElement('commitment-range-bar') as BarEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('renders nothing when no state set', () => {
    expect(el.shadowRoot!.querySelector('.bar')).toBeNull();
    expect(el.shadowRoot!.querySelector('.detailed-container')).toBeNull();
  });

  describe('compact mode', () => {
    it('renders a bar element', async () => {
      el.state = 'OPEN';
      el.createdAt = '2026-07-14T08:00:00Z';
      await el.updateComplete;
      const bar = el.shadowRoot!.querySelector('.bar');
      expect(bar).toBeTruthy();
    });

    it('has title attribute for accessibility', async () => {
      el.state = 'ACKNOWLEDGED';
      el.createdAt = '2026-07-14T08:00:00Z';
      await el.updateComplete;
      const bar = el.shadowRoot!.querySelector('[title]');
      expect(bar?.getAttribute('title')).toContain('ACKNOWLEDGED');
    });

    it('shows pulse class for open commitments', async () => {
      el.state = 'OPEN';
      el.createdAt = '2026-07-14T08:00:00Z';
      await el.updateComplete;
      const bar = el.shadowRoot!.querySelector('.bar');
      expect(bar?.classList.contains('pulse')).toBe(true);
    });

    it('does not pulse for terminal commitments', async () => {
      el.state = 'FULFILLED';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.resolvedAt = '2026-07-14T14:00:00Z';
      await el.updateComplete;
      const bar = el.shadowRoot!.querySelector('.bar');
      expect(bar?.classList.contains('pulse')).toBe(false);
    });

    it('renders deadline tick when deadline is set', async () => {
      el.state = 'OPEN';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.deadline = '2026-07-14T16:00:00Z';
      await el.updateComplete;
      const tick = el.shadowRoot!.querySelector('.deadline-tick');
      expect(tick).toBeTruthy();
    });

    it('has aria-label', async () => {
      el.state = 'OPEN';
      el.createdAt = '2026-07-14T08:00:00Z';
      await el.updateComplete;
      const bar = el.shadowRoot!.querySelector('[aria-label]');
      expect(bar).toBeTruthy();
    });
  });

  describe('detailed mode', () => {
    it('renders milestone markers', async () => {
      el.state = 'FULFILLED';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.acknowledgedAt = '2026-07-14T08:15:00Z';
      el.resolvedAt = '2026-07-14T14:00:00Z';
      el.mode = 'detailed';
      await el.updateComplete;
      const milestones = el.shadowRoot!.querySelectorAll('.milestone');
      expect(milestones.length).toBeGreaterThanOrEqual(2);
    });

    it('renders Created label', async () => {
      el.state = 'OPEN';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.mode = 'detailed';
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Created');
    });

    it('renders Acknowledged milestone when acknowledgedAt is set', async () => {
      el.state = 'ACKNOWLEDGED';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.acknowledgedAt = '2026-07-14T08:15:00Z';
      el.mode = 'detailed';
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Acknowledged');
    });

    it('renders terminal state milestone when resolvedAt is set', async () => {
      el.state = 'FULFILLED';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.resolvedAt = '2026-07-14T14:00:00Z';
      el.mode = 'detailed';
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Fulfilled');
    });

    it('has aria-label', async () => {
      el.state = 'OPEN';
      el.createdAt = '2026-07-14T08:00:00Z';
      el.mode = 'detailed';
      await el.updateComplete;
      const container = el.shadowRoot!.querySelector('[aria-label]');
      expect(container).toBeTruthy();
    });
  });

  it('re-renders on state change', async () => {
    el.state = 'OPEN';
    el.createdAt = '2026-07-14T08:00:00Z';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.pulse')).toBeTruthy();
    el.state = 'FULFILLED';
    el.resolvedAt = '2026-07-14T14:00:00Z';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.pulse')).toBeFalsy();
  });
});
