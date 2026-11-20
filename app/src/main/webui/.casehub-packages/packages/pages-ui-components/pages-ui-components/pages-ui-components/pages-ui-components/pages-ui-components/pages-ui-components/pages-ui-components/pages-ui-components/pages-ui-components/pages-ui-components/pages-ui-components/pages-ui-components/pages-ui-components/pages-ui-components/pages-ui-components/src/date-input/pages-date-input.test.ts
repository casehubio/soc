import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesDateInput', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-date-input');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-date-input')).toBeDefined();
  });

  it('renders a date input in shadow DOM', async () => {
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('date');
  });

  it('reflects value property', async () => {
    (el as any).value = '2026-08-26';
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('2026-08-26');
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Start Date';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Start Date');
  });

  it('shows error message', async () => {
    (el as any).error = 'Invalid date';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('Invalid date');
  });

  it('sets readonly attribute', async () => {
    (el as any).readonly = true;
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('input')!.readOnly).toBe(true);
  });

  it('sets min and max', async () => {
    (el as any).min = '2026-01-01';
    (el as any).max = '2026-12-31';
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.min).toBe('2026-01-01');
    expect(input.max).toBe('2026-12-31');
  });
});
