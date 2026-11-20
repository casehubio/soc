import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './casehub-diagram-palette.js';

type PaletteEl = HTMLElement & { disabled: boolean; updateComplete: Promise<boolean> };

describe('casehub-diagram-palette', () => {
  let el: PaletteEl;

  beforeEach(async () => {
    el = document.createElement('casehub-diagram-palette') as PaletteEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('sets role="toolbar" and aria-label on connect', () => {
    expect(el.getAttribute('role')).toBe('toolbar');
    expect(el.getAttribute('aria-label')).toBe('Diagram palette');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('reflects disabled as aria-disabled', async () => {
    el.disabled = true;
    await el.updateComplete;
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders four palette items', () => {
    const buttons = el.shadowRoot!.querySelectorAll('button');
    expect(buttons.length).toBe(4);
  });

  it('emits palette-add with correct elementType on click', () => {
    const handler = vi.fn();
    el.addEventListener('palette-add', handler);
    const buttons = el.shadowRoot!.querySelectorAll('button');
    buttons[0].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.elementType).toBe('binding');
  });

  it('emits correct types for each button', () => {
    const handler = vi.fn();
    el.addEventListener('palette-add', handler);
    const buttons = el.shadowRoot!.querySelectorAll('button');
    const expected = ['binding', 'worker', 'milestone', 'goal'];
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].click();
      expect(handler.mock.calls[i][0].detail.elementType).toBe(expected[i]);
    }
  });

  it('disables all buttons when disabled property is set', async () => {
    el.disabled = true;
    await el.updateComplete;
    const buttons = el.shadowRoot!.querySelectorAll('button');
    for (const btn of buttons) {
      expect(btn.disabled).toBe(true);
    }
  });

  it('does not emit when disabled', async () => {
    el.disabled = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('palette-add', handler);
    const buttons = el.shadowRoot!.querySelectorAll('button');
    buttons[0].click();
    expect(handler).not.toHaveBeenCalled();
  });
});
