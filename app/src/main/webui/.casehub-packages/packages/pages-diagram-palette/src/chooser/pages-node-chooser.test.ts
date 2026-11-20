import { describe, it, expect, beforeEach } from 'vitest';
import type { PaletteItem } from '../types.js';

import './pages-node-chooser.js';

if (typeof globalThis.PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
      this.pointerId = init?.pointerId ?? 0;
    }
  };
}

const items: PaletteItem[] = [
  { type: 'source', label: 'Source', icon: '⬇', group: 'Input' },
  { type: 'transform', label: 'Transform', icon: '⚙', group: 'Processing' },
  { type: 'filter', label: 'Filter', icon: '⧖', group: 'Processing' },
];

function createElement(props: Partial<{ items: PaletteItem[]; searchThreshold: number; abortSignal: AbortSignal }> = {}) {
  const el = document.createElement('pages-node-chooser') as any;
  el.items = props.items ?? items;
  if (props.searchThreshold !== undefined) el.searchThreshold = props.searchThreshold;
  if (props.abortSignal) el.abortSignal = props.abortSignal;
  document.body.appendChild(el);
  return el;
}

describe('pages-node-chooser', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('registers as custom element', () => {
    expect(customElements.get('pages-node-chooser')).toBeDefined();
  });

  it('has role="dialog" with aria-label and aria-modal', async () => {
    const el = createElement();
    await el.updateComplete;
    const dialog = el.shadowRoot.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-label')).toBe('Choose node type');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('contains a listbox with options', async () => {
    const el = createElement();
    await el.updateComplete;
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
  });

  it('fires pages-palette-select then pages-chooser-dismiss on item click', async () => {
    const el = createElement();
    await el.updateComplete;
    const selected: any[] = [];
    let dismissed = false;
    el.addEventListener('pages-palette-select', (e: CustomEvent) => selected.push(e.detail));
    el.addEventListener('pages-chooser-dismiss', () => { dismissed = true; });
    const item = el.shadowRoot.querySelector('[role="option"]');
    item?.click();
    expect(selected).toHaveLength(1);
    expect(dismissed).toBe(true);
  });

  it('fires pages-chooser-dismiss on Escape', async () => {
    const el = createElement();
    await el.updateComplete;
    let dismissed = false;
    el.addEventListener('pages-chooser-dismiss', () => { dismissed = true; });
    el.shadowRoot.querySelector('[role="dialog"]')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    expect(dismissed).toBe(true);
  });

  it('fires pages-chooser-dismiss on abortSignal', async () => {
    const ac = new AbortController();
    const el = createElement({ abortSignal: ac.signal });
    await el.updateComplete;
    let dismissed = false;
    el.addEventListener('pages-chooser-dismiss', () => { dismissed = true; });
    ac.abort();
    expect(dismissed).toBe(true);
  });

  it('fires pages-chooser-dismiss on click outside', async () => {
    const el = createElement();
    await el.updateComplete;
    let dismissed = false;
    el.addEventListener('pages-chooser-dismiss', () => { dismissed = true; });

    await new Promise(r => requestAnimationFrame(r));

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dismissed).toBe(true);
  });
});
