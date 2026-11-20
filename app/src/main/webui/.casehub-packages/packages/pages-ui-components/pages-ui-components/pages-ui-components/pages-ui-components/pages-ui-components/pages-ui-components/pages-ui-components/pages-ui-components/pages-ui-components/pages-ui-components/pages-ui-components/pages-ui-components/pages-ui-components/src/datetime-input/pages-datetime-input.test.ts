import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesDatetimeInput', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-datetime-input');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-datetime-input')).toBeDefined();
  });

  it('renders a datetime-local input in shadow DOM', async () => {
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('datetime-local');
  });

  it('reflects value property', async () => {
    (el as any).value = '2026-08-26T14:30';
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('2026-08-26T14:30');
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Deadline';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Deadline');
  });

  it('shows error message', async () => {
    (el as any).error = 'Invalid';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('Invalid');
  });

  it('sets readonly attribute', async () => {
    (el as any).readonly = true;
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('input')!.readOnly).toBe(true);
  });
});
