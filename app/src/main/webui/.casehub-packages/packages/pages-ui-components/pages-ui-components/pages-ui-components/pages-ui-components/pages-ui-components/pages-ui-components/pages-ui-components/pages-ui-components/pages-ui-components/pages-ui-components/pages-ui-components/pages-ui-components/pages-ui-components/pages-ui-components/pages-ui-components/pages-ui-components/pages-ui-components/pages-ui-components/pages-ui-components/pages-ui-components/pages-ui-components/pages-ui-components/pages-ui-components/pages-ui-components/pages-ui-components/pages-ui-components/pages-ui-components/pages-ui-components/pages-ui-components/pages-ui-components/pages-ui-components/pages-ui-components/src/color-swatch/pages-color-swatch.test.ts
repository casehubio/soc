import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesColorSwatch', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-color-swatch');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-color-swatch')).toBeDefined();
  });

  it('renders a color input and hex text input', async () => {
    await (el as any).updateComplete;
    const colorInput = el.shadowRoot!.querySelector('input[type="color"]');
    const textInput = el.shadowRoot!.querySelector('input[type="text"]');
    expect(colorInput).not.toBeNull();
    expect(textInput).not.toBeNull();
  });

  it('reflects value as hex color on both inputs', async () => {
    (el as any).value = '#ff0000';
    await (el as any).updateComplete;
    const colorInput = el.shadowRoot!.querySelector('input[type="color"]') as HTMLInputElement;
    const textInput = el.shadowRoot!.querySelector('input[type="text"]') as HTMLInputElement;
    expect(colorInput.value).toBe('#ff0000');
    expect(textInput.value).toBe('#ff0000');
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Background';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('label')!.textContent).toContain('Background');
  });

  it('shows error message', async () => {
    (el as any).error = 'Invalid color';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('Invalid color');
  });

  it('disables color picker when readonly', async () => {
    (el as any).readonly = true;
    await (el as any).updateComplete;
    const colorInput = el.shadowRoot!.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput.disabled).toBe(true);
    const textInput = el.shadowRoot!.querySelector('input[type="text"]') as HTMLInputElement;
    expect(textInput.readOnly).toBe(true);
  });

  it('disables both inputs when disabled', async () => {
    (el as any).disabled = true;
    await (el as any).updateComplete;
    const colorInput = el.shadowRoot!.querySelector('input[type="color"]') as HTMLInputElement;
    const textInput = el.shadowRoot!.querySelector('input[type="text"]') as HTMLInputElement;
    expect(colorInput.disabled).toBe(true);
    expect(textInput.disabled).toBe(true);
  });

  it('defaults to #000000', () => {
    expect((el as any).value).toBe('#000000');
  });
});
