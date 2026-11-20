import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './sla-indicator.js';

type SlaIndicatorEl = HTMLElement & {
  deadline: string;
  slaWindow: number | null;
  warningThreshold: number;
  criticalThreshold: number;
  escalationStage: string | null;
  compact: boolean;
  updateComplete: Promise<boolean>;
  configure: (props: Record<string, unknown>) => void;
};

describe('agency-sla-indicator', () => {
  let el: SlaIndicatorEl;

  beforeEach(async () => {
    vi.useFakeTimers();
    el = document.createElement('agency-sla-indicator') as SlaIndicatorEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders countdown for a future deadline', async () => {
    el.deadline = new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString();
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('2d');
  });

  it('renders breach state for a past deadline', async () => {
    el.deadline = new Date(Date.now() - 3 * 3600000).toISOString();
    await el.updateComplete;
    expect(el.shadowRoot!.textContent!.toLowerCase()).toContain('breach');
  });

  it('transitions through warning state', async () => {
    el.slaWindow = 3600000;
    el.warningThreshold = 0.5;
    el.deadline = new Date(Date.now() + 1200000).toISOString();
    await el.updateComplete;
    const host = el.shadowRoot!.querySelector('.sla-indicator')!;
    expect(host.classList.contains('warning')).toBe(true);
  });

  it('transitions through critical state', async () => {
    el.slaWindow = 3600000;
    el.criticalThreshold = 0.1;
    el.deadline = new Date(Date.now() + 60000).toISOString();
    await el.updateComplete;
    const host = el.shadowRoot!.querySelector('.sla-indicator')!;
    expect(host.classList.contains('critical')).toBe(true);
  });

  it('uses absolute fallback thresholds when no slaWindow', async () => {
    el.deadline = new Date(Date.now() + 600000).toISOString();
    await el.updateComplete;
    const host = el.shadowRoot!.querySelector('.sla-indicator')!;
    expect(host.classList.contains('critical')).toBe(true);
  });

  it('renders escalation badge when escalationStage is set', async () => {
    el.deadline = new Date(Date.now() - 3600000).toISOString();
    el.escalationStage = 'L2';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('L2');
  });

  it('emits initial state event on connectedCallback', async () => {
    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    el.deadline = new Date(Date.now() + 86400000).toISOString();
    await el.updateComplete;
    const stateEvent = handler.mock.calls.find(
      (c: any) => c[0].detail.topic === 'sla.state-changed'
    );
    expect(stateEvent).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('emits state-changed on threshold crossing', async () => {
    el.slaWindow = 60000;
    el.warningThreshold = 0.5;
    el.deadline = new Date(Date.now() + 35000).toISOString();
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    vi.advanceTimersByTime(10000);
    await el.updateComplete;

    const events = handler.mock.calls
      .filter((c: any) => c[0].detail.topic === 'sla.state-changed')
      .map((c: any) => c[0].detail.payload.state);

    expect(events).toContain('warning');
    document.removeEventListener('pages-event', handler);
  });

  it('has role="timer" and aria-label', async () => {
    el.deadline = new Date(Date.now() + 7200000).toISOString();
    await el.updateComplete;
    const indicator = el.shadowRoot!.querySelector('[role="timer"]');
    expect(indicator).toBeTruthy();
    expect(indicator!.getAttribute('aria-label')).toBeTruthy();
  });

  it('shows tooltip with absolute datetime', async () => {
    el.deadline = '2026-07-08T14:30:00Z';
    await el.updateComplete;
    const indicator = el.shadowRoot!.querySelector('[title]');
    expect(indicator).toBeTruthy();
    expect(indicator!.getAttribute('title')).toContain('2026');
  });

  it('configure() sets multiple properties', async () => {
    el.configure({ deadline: '2026-07-10T00:00:00Z', compact: false, escalationStage: 'Manager' });
    await el.updateComplete;
    expect(el.compact).toBe(false);
    expect(el.escalationStage).toBe('Manager');
  });

  it('renders minutes+seconds when under 1 hour', async () => {
    el.deadline = new Date(Date.now() + 180000).toISOString();
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toMatch(/\d+m/);
  });

  it('updates countdown on timer tick', async () => {
    el.deadline = new Date(Date.now() + 120000).toISOString();
    await el.updateComplete;
    const before = el.shadowRoot!.textContent;
    vi.advanceTimersByTime(60000);
    await el.updateComplete;
    const after = el.shadowRoot!.textContent;
    expect(after).not.toBe(before);
  });

  it('renders nothing for an invalid deadline', async () => {
    el.deadline = 'not-a-date';
    await el.updateComplete;
    const indicator = el.shadowRoot!.querySelector('.sla-indicator');
    expect(indicator).toBeFalsy();
  });

  it('does not emit state-changed for an invalid deadline', async () => {
    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    el.deadline = 'not-a-date';
    await el.updateComplete;
    const stateEvent = handler.mock.calls.find(
      (c: any) => c[0].detail.topic === 'sla.state-changed'
    );
    expect(stateEvent).toBeFalsy();
    document.removeEventListener('pages-event', handler);
  });

  it('transitions from valid to invalid deadline without emitting', async () => {
    el.deadline = new Date(Date.now() + 86400000).toISOString();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.sla-indicator')).toBeTruthy();

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    el.deadline = 'now-invalid';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.sla-indicator')).toBeFalsy();
    const stateEvent = handler.mock.calls.find(
      (c: any) => c[0].detail.topic === 'sla.state-changed'
    );
    expect(stateEvent).toBeFalsy();
    document.removeEventListener('pages-event', handler);
  });
});
