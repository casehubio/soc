import { describe, it, expect, beforeEach } from 'vitest';
import type { ConvergenceSignal } from './types.js';
import './blocks-convergence-indicator.js';

type IndicatorElement = HTMLElement & {
  signal?: ConvergenceSignal;
  size?: string;
  updateComplete: Promise<boolean>;
};

function createElement(): IndicatorElement {
  const el = document.createElement('blocks-convergence-indicator') as IndicatorElement;
  document.body.appendChild(el);
  return el;
}

describe('blocks-convergence-indicator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing without signal', async () => {
    const el = createElement();
    await el.updateComplete;
    const container = el.shadowRoot?.querySelector('.container');
    expect(container).toBeNull();
  });

  it('renders bar with correct width for confidence', async () => {
    const el = createElement();
    el.signal = { state: 'CONVERGING', confidence: 0.72, reason: 'Progress on auth' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.width).toBe('72%');
  });

  it('clamps confidence above 1', async () => {
    const el = createElement();
    el.signal = { state: 'CONVERGING', confidence: 1.5, reason: '' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill') as HTMLElement;
    expect(bar.style.width).toBe('100%');
  });

  it('clamps confidence below 0', async () => {
    const el = createElement();
    el.signal = { state: 'CONVERGING', confidence: -0.5, reason: '' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('handles NaN confidence', async () => {
    const el = createElement();
    el.signal = { state: 'PROGRESSING', confidence: NaN, reason: '' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('shows state label in md mode', async () => {
    const el = createElement();
    el.signal = { state: 'CONSENSUS', confidence: 0.95, reason: 'Agreement reached' };
    el.size = 'md';
    await el.updateComplete;
    const label = el.shadowRoot?.querySelector('.state-label');
    expect(label?.textContent).toContain('CONSENSUS');
  });

  it('hides state label in sm mode', async () => {
    const el = createElement();
    el.signal = { state: 'CONSENSUS', confidence: 0.95, reason: 'Agreement reached' };
    el.size = 'sm';
    await el.updateComplete;
    const label = el.shadowRoot?.querySelector('.state-label');
    expect(label).toBeNull();
  });

  it('sets reason as title on bar', async () => {
    const el = createElement();
    el.signal = { state: 'DEADLOCK', confidence: 0.1, reason: 'Cannot agree on TTL' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill') as HTMLElement;
    expect(bar.title).toBe('Cannot agree on TTL');
  });

  it('shows percentage', async () => {
    const el = createElement();
    el.signal = { state: 'CONVERGING', confidence: 0.72, reason: '' };
    await el.updateComplete;
    const pct = el.shadowRoot?.querySelector('.percentage');
    expect(pct?.textContent).toContain('72%');
  });

  it('applies pulse class for terminal states', async () => {
    const el = createElement();
    el.signal = { state: 'CONSENSUS', confidence: 0.95, reason: '' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill');
    expect(bar?.classList.contains('pulse')).toBe(true);
  });

  it('does not apply pulse for non-terminal states', async () => {
    const el = createElement();
    el.signal = { state: 'CONVERGING', confidence: 0.72, reason: '' };
    await el.updateComplete;
    const bar = el.shadowRoot?.querySelector('.bar-fill');
    expect(bar?.classList.contains('pulse')).toBe(false);
  });
});
