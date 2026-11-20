import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesSlider', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-slider');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-slider')).toBeDefined();
  });

  it('renders range and number inputs', async () => {
    await (el as any).updateComplete;
    const range = el.shadowRoot!.querySelector('input[type="range"]');
    const number = el.shadowRoot!.querySelector('input[type="number"]');
    expect(range).not.toBeNull();
    expect(number).not.toBeNull();
  });

  it('syncs range and number values', async () => {
    (el as any).value = 50;
    (el as any).min = 0;
    (el as any).max = 100;
    await (el as any).updateComplete;
    const range = el.shadowRoot!.querySelector('input[type="range"]') as HTMLInputElement;
    const number = el.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement;
    expect(range.value).toBe('50');
    expect(number.value).toBe('50');
  });

  it('sets min/max/step on both inputs', async () => {
    (el as any).min = 10;
    (el as any).max = 90;
    (el as any).step = 5;
    await (el as any).updateComplete;
    const range = el.shadowRoot!.querySelector('input[type="range"]') as HTMLInputElement;
    const number = el.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement;
    expect(range.min).toBe('10');
    expect(range.max).toBe('90');
    expect(range.step).toBe('5');
    expect(number.min).toBe('10');
    expect(number.max).toBe('90');
    expect(number.step).toBe('5');
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Opacity';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Opacity');
  });

  it('shows error message', async () => {
    (el as any).error = 'Out of range';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('Out of range');
  });

  it('disables both inputs when disabled', async () => {
    (el as any).disabled = true;
    await (el as any).updateComplete;
    const range = el.shadowRoot!.querySelector('input[type="range"]') as HTMLInputElement;
    const number = el.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement;
    expect(range.disabled).toBe(true);
    expect(number.disabled).toBe(true);
  });

  it('disables range and sets readonly on number when readonly', async () => {
    (el as any).readonly = true;
    await (el as any).updateComplete;
    const range = el.shadowRoot!.querySelector('input[type="range"]') as HTMLInputElement;
    const number = el.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement;
    expect(range.disabled).toBe(true);
    expect(number.readOnly).toBe(true);
  });

  it('defaults to 0 value, 0-100 range, step 1', () => {
    expect((el as any).value).toBe(0);
    expect((el as any).min).toBe(0);
    expect((el as any).max).toBe(100);
    expect((el as any).step).toBe(1);
  });
});
