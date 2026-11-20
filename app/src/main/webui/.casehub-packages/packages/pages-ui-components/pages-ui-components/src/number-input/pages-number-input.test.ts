import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesNumberInput', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-number-input');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-number-input')).toBeDefined();
  });

  it('renders a number input in shadow DOM', async () => {
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('number');
  });

  it('sets min/max/step attributes', async () => {
    (el as any).min = 0;
    (el as any).max = 100;
    (el as any).step = 5;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
    expect(input.step).toBe('5');
  });

  it('reflects value property', async () => {
    (el as any).value = 42;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('42');
  });

  it('renders null value as empty', async () => {
    (el as any).value = null;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('');
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Count';
    await (el as any).updateComplete;
    const label = el.shadowRoot!.querySelector('label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Count');
  });

  it('shows error message', async () => {
    (el as any).error = 'Too low';
    await (el as any).updateComplete;
    const err = el.shadowRoot!.querySelector('[role="alert"]');
    expect(err).not.toBeNull();
    expect(err!.textContent).toBe('Too low');
  });

  it('sets readonly attribute on input', async () => {
    (el as any).readonly = true;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.readOnly).toBe(true);
  });

  it('sets disabled attribute on input', async () => {
    (el as any).disabled = true;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.disabled).toBe(true);
  });

  it('sets placeholder', async () => {
    (el as any).placeholder = '0';
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.placeholder).toBe('0');
  });

  it('sets aria attributes', async () => {
    (el as any).label = 'Age';
    (el as any).required = true;
    (el as any).error = 'Required';
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Age');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
