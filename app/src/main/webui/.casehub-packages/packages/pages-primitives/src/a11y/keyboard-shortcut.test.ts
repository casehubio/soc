import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeyboardShortcutMixin } from './keyboard-shortcut.js';

@customElement('test-shortcuts')
class TestShortcuts extends KeyboardShortcutMixin(LitElement) {
  override render() {
    return html`<input type="text" /><button>Action</button>`;
  }
}

describe('KeyboardShortcutMixin', () => {
  let el: TestShortcuts;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    handler = vi.fn();
    el = document.createElement('test-shortcuts') as TestShortcuts;
    document.body.appendChild(el);
    await el.updateComplete;
    el.registerShortcut('c', handler, { description: 'Claim' });
  });

  afterEach(() => { el.remove(); });

  it('fires handler on key press', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('suppresses when focus is in a text input', async () => {
    const input = el.shadowRoot!.querySelector('input')!;
    input.focus();
    await el.updateComplete;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('lists registered shortcuts', () => {
    const shortcuts = el.getShortcuts();
    expect(shortcuts).toEqual([{ key: 'c', description: 'Claim' }]);
  });
});
