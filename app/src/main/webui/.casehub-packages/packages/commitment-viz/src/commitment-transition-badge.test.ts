import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TransitionRecord } from './types.js';
import './commitment-transition-badge.js';
import '@casehubio/mosaic-core';

type BadgeEl = HTMLElement & {
  transition?: TransitionRecord;
  compact: boolean;
  updateComplete: Promise<boolean>;
};

const sampleTransition: TransitionRecord = {
  from: 'OPEN',
  to: 'ACKNOWLEDGED',
  actor: 'agent-alice',
  timestamp: '2026-07-14T08:15:00Z',
};

describe('commitment-transition-badge', () => {
  let el: BadgeEl;

  beforeEach(async () => {
    el = document.createElement('commitment-transition-badge') as BadgeEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('renders nothing when no transition set', () => {
    expect(el.shadowRoot!.querySelector('.pill')).toBeNull();
  });

  it('renders from and to state pills', async () => {
    el.transition = sampleTransition;
    await el.updateComplete;
    const pills = el.shadowRoot!.querySelectorAll('pages-status-badge');
    expect(pills.length).toBe(2);
  });

  it('renders arrow between states', async () => {
    el.transition = sampleTransition;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('→');
  });

  it('renders actor in full mode', async () => {
    el.transition = sampleTransition;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('agent-alice');
  });

  it('hides actor in compact mode', async () => {
    el.transition = sampleTransition;
    el.compact = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain('agent-alice');
  });

  it('hides meta section in compact mode', async () => {
    el.transition = sampleTransition;
    el.compact = true;
    await el.updateComplete;
    const meta = el.shadowRoot!.querySelector('.meta');
    expect(meta).toBeNull();
  });

  it('handles transition without actor', async () => {
    el.transition = { from: 'OPEN', to: 'EXPIRED', timestamp: '2026-07-14T08:15:00Z' };
    await el.updateComplete;
    const pills = el.shadowRoot!.querySelectorAll('pages-status-badge');
    expect(pills.length).toBe(2);
  });

  it('has accessible aria-label', async () => {
    el.transition = sampleTransition;
    await el.updateComplete;
    const container = el.shadowRoot!.querySelector('[aria-label]');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('aria-label')).toContain('OPEN');
    expect(container?.getAttribute('aria-label')).toContain('ACKNOWLEDGED');
  });
});
