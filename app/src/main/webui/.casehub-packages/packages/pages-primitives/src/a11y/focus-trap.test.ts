import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FocusTrapMixin } from './focus-trap.js';

@customElement('test-trap')
class TestTrap extends FocusTrapMixin(LitElement) {
  override render() {
    return html`
      <div class="container">
        <button id="first">First</button>
        <input id="middle" type="text" />
        <button id="last">Last</button>
      </div>
    `;
  }
}

describe('FocusTrapMixin', () => {
  let el: TestTrap;

  beforeEach(async () => {
    el = document.createElement('test-trap') as TestTrap;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('focuses first focusable element on trapFocus', () => {
    const container = el.shadowRoot!.querySelector('.container') as HTMLElement;
    const first = el.shadowRoot!.querySelector('#first') as HTMLElement;
    const spy = vi.spyOn(first, 'focus');
    el.trapFocus(container);
    expect(spy).toHaveBeenCalled();
    el.releaseFocus();
  });

  it('wraps focus forward from last to first', () => {
    const container = el.shadowRoot!.querySelector('.container') as HTMLElement;
    el.trapFocus(container);
    const first = el.shadowRoot!.querySelector('#first') as HTMLElement;
    const last = el.shadowRoot!.querySelector('#last') as HTMLElement;

    last.focus();
    const spy = vi.spyOn(first, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(spy).toHaveBeenCalled();
    el.releaseFocus();
  });

  it('wraps focus backward from first to last', () => {
    const container = el.shadowRoot!.querySelector('.container') as HTMLElement;
    el.trapFocus(container);
    const first = el.shadowRoot!.querySelector('#first') as HTMLElement;
    const last = el.shadowRoot!.querySelector('#last') as HTMLElement;

    first.focus();
    const spy = vi.spyOn(last, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(spy).toHaveBeenCalled();
    el.releaseFocus();
  });

  it('restores focus to previous element on releaseFocus', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const container = el.shadowRoot!.querySelector('.container') as HTMLElement;
    el.trapFocus(container);
    const spy = vi.spyOn(outside, 'focus');
    el.releaseFocus();
    expect(spy).toHaveBeenCalled();
    outside.remove();
  });

  it('cleans up on disconnectedCallback', () => {
    const container = el.shadowRoot!.querySelector('.container') as HTMLElement;
    el.trapFocus(container);
    el.remove();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  });

  it('ignores non-Tab keys', () => {
    const container = el.shadowRoot!.querySelector('.container') as HTMLElement;
    el.trapFocus(container);
    const first = el.shadowRoot!.querySelector('#first') as HTMLElement;
    const last = el.shadowRoot!.querySelector('#last') as HTMLElement;
    const firstSpy = vi.spyOn(first, 'focus');
    const lastSpy = vi.spyOn(last, 'focus');

    first.focus();
    firstSpy.mockClear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(firstSpy).not.toHaveBeenCalled();
    expect(lastSpy).not.toHaveBeenCalled();
    el.releaseFocus();
  });
});

@customElement('test-trap-slots')
class TestTrapSlots extends FocusTrapMixin(LitElement) {
  override render() {
    return html`
      <div class="container">
        <button id="shadow-btn">Shadow</button>
        <slot></slot>
        <slot name="actions"></slot>
      </div>
    `;
  }
}

describe('FocusTrapMixin — slot traversal', () => {
  let host: TestTrapSlots;

  beforeEach(async () => {
    host = document.createElement('test-trap-slots') as TestTrapSlots;
    host.innerHTML = `
      <input type="text" id="slotted-input" />
      <button slot="actions" id="slotted-btn">Action</button>
    `;
    document.body.appendChild(host);
    await host.updateComplete;
  });

  afterEach(() => { host.remove(); });

  it('collects focusable elements from slotted content', () => {
    const container = host.shadowRoot!.querySelector('.container') as HTMLElement;
    const shadowBtn = host.shadowRoot!.querySelector('#shadow-btn') as HTMLElement;

    host.trapFocus(container);

    const slottedBtn = host.querySelector('#slotted-btn') as HTMLElement;
    slottedBtn.focus();

    const spy = vi.spyOn(shadowBtn, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(spy).toHaveBeenCalled();

    host.releaseFocus();
  });

  it('handles empty slots gracefully', async () => {
    const empty = document.createElement('test-trap-slots') as TestTrapSlots;
    document.body.appendChild(empty);
    await empty.updateComplete;

    const container = empty.shadowRoot!.querySelector('.container') as HTMLElement;
    const shadowBtn = empty.shadowRoot!.querySelector('#shadow-btn') as HTMLElement;
    const spy = vi.spyOn(shadowBtn, 'focus');
    empty.trapFocus(container);
    expect(spy).toHaveBeenCalled();

    empty.releaseFocus();
    empty.remove();
  });
});
