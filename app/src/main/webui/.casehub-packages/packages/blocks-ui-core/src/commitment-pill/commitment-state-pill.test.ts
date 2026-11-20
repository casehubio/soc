import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CommitmentState } from '../types/commitment.js';
import './commitment-state-pill.js';

type PillEl = HTMLElement & {
  state: CommitmentState;
  size: 'sm' | 'md';
  showIcon: boolean;
  updateComplete: Promise<boolean>;
};

type BadgeEl = HTMLElement & { updateComplete: Promise<boolean> };

async function getBadge(el: PillEl): Promise<BadgeEl | null> {
  await el.updateComplete;
  const badge = el.shadowRoot!.querySelector('status-badge') as BadgeEl | null;
  if (badge) await badge.updateComplete;
  return badge;
}

describe('commitment-state-pill', () => {
  let el: PillEl;

  beforeEach(async () => {
    el = document.createElement('commitment-state-pill') as PillEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('renders nothing when no state set', () => {
    expect(el.shadowRoot!.querySelector('status-badge')).toBeNull();
  });

  it('renders the state label', async () => {
    el.state = 'OPEN';
    const badge = await getBadge(el);
    expect(badge!.shadowRoot!.textContent).toContain('OPEN');
  });

  it.each([
    'OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'FAILED',
    'DECLINED', 'DELEGATED', 'EXPIRED',
  ] as CommitmentState[])('renders %s state', async (state) => {
    el.state = state;
    const badge = await getBadge(el);
    expect(badge!.shadowRoot!.textContent).toContain(state);
  });

  it('defaults to sm size', () => {
    expect(el.size).toBe('sm');
  });

  it('applies md size styles', async () => {
    el.state = 'OPEN';
    el.size = 'md';
    const badge = await getBadge(el);
    const pill = badge!.shadowRoot!.querySelector('.pill') as HTMLElement;
    expect(pill).toBeTruthy();
    expect(pill.style.fontSize).toBe('12px');
  });

  it('shows icon when showIcon is true', async () => {
    el.state = 'FULFILLED';
    el.showIcon = true;
    const badge = await getBadge(el);
    const icon = badge!.shadowRoot!.querySelector('.icon');
    expect(icon).toBeTruthy();
  });

  it('hides icon by default', async () => {
    el.state = 'OPEN';
    const badge = await getBadge(el);
    const icon = badge!.shadowRoot!.querySelector('.icon');
    expect(icon).toBeNull();
  });

  it('has aria-label with state name', async () => {
    el.state = 'ACKNOWLEDGED';
    const badge = await getBadge(el);
    const pill = badge!.shadowRoot!.querySelector('.pill');
    expect(pill?.getAttribute('aria-label')).toContain('ACKNOWLEDGED');
  });

  it('re-renders on state change', async () => {
    el.state = 'OPEN';
    let badge = await getBadge(el);
    expect(badge!.shadowRoot!.textContent).toContain('OPEN');
    el.state = 'FULFILLED';
    badge = await getBadge(el);
    expect(badge!.shadowRoot!.textContent).toContain('FULFILLED');
    expect(badge!.shadowRoot!.textContent).not.toContain('OPEN');
  });
});
