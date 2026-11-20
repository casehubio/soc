import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerStatus } from '../types/status.js';
import './status-badge.js';

type BadgeEl = HTMLElement & {
  state?: string;
  domain?: string;
  size: 'sm' | 'md';
  showIcon: boolean;
  updateComplete: Promise<boolean>;
};

describe('status-badge', () => {
  let el: BadgeEl;

  beforeEach(async () => {
    el = document.createElement('status-badge') as BadgeEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('renders nothing when no state set', () => {
    expect(el.shadowRoot!.querySelector('.pill')).toBeNull();
  });

  it('renders nothing for empty string state', async () => {
    el.state = '';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.pill')).toBeNull();
  });

  it('renders the state label', async () => {
    el.state = 'COMPLETED';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('COMPLETED');
  });

  it('renders domain-specific descriptor', async () => {
    el.domain = 'case';
    el.state = 'STARTING';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill') as HTMLElement;
    expect(pill).toBeTruthy();
    expect(pill.style.background).toContain('--pages-info-3');
  });

  it('falls back to cross-domain default', async () => {
    el.state = 'COMPLETED';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill') as HTMLElement;
    expect(pill.style.background).toContain('--pages-success-3');
  });

  it('shows icon when showIcon is true', async () => {
    el.state = 'RUNNING';
    el.showIcon = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.icon')).toBeTruthy();
  });

  it('hides icon by default', async () => {
    el.state = 'RUNNING';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.icon')).toBeNull();
  });

  it('applies md size styles', async () => {
    el.state = 'RUNNING';
    el.size = 'md';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill') as HTMLElement;
    expect(pill.style.fontSize).toBe('12px');
  });

  it('defaults to sm size', () => {
    expect(el.size).toBe('sm');
  });

  it('has aria-label with state', async () => {
    el.domain = 'task';
    el.state = 'DELEGATED';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill');
    expect(pill?.getAttribute('aria-label')).toContain('DELEGATED');
  });

  it('uses label override from descriptor', async () => {
    registerStatus('_testlabel', 'X', { category: 'info', icon: '!', label: 'Custom' });
    el.domain = '_testlabel';
    el.state = 'X';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Custom');
  });

  it('renders fallback for unknown domain+state', async () => {
    el.domain = 'nonexistent';
    el.state = 'UNKNOWN';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill') as HTMLElement;
    expect(pill).toBeTruthy();
    expect(pill.style.background).toContain('--pages-neutral-3');
  });
});
