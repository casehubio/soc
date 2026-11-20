import { describe, it, expect, beforeEach } from 'vitest';
import type { PaletteItem } from '../types.js';

const store = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => { store.clear(); },
    },
    writable: true,
  });
}

import './pages-diagram-palette.js';

const items: PaletteItem[] = [
  { type: 'source', label: 'Source', icon: '⬇', group: 'Input' },
  { type: 'transform', label: 'Transform', icon: '⚙', group: 'Processing' },
  { type: 'filter', label: 'Filter', icon: '⧖', group: 'Processing' },
  { type: 'sink', label: 'Sink', icon: '⬆', group: 'Output' },
];

function createElement(props: Partial<{ items: PaletteItem[]; paletteId: string; searchThreshold: number }> = {}) {
  const el = document.createElement('pages-diagram-palette') as any;
  el.items = props.items ?? items;
  if (props.paletteId) el.paletteId = props.paletteId;
  if (props.searchThreshold !== undefined) el.searchThreshold = props.searchThreshold;
  document.body.appendChild(el);
  return el;
}

describe('pages-diagram-palette', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('registers as custom element', () => {
    expect(customElements.get('pages-diagram-palette')).toBeDefined();
  });

  it('renders items grouped by group field', async () => {
    const el = createElement();
    await el.updateComplete;
    const groups = el.shadowRoot.querySelectorAll('details.palette-group');
    expect(groups.length).toBe(3);
  });

  it('fires pages-palette-select on item click', async () => {
    const el = createElement();
    await el.updateComplete;
    const fired: any[] = [];
    el.addEventListener('pages-palette-select', (e: CustomEvent) => fired.push(e.detail));
    const item = el.shadowRoot.querySelector('.palette-item');
    item?.click();
    expect(fired).toHaveLength(1);
    expect(fired[0].item.type).toBeDefined();
  });

  it('shows search input when items exceed threshold', async () => {
    const el = createElement({ searchThreshold: 3 });
    await el.updateComplete;
    const search = el.shadowRoot.querySelector('[role="searchbox"]');
    expect(search).not.toBeNull();
  });

  it('hides search input when items below threshold', async () => {
    const el = createElement({ searchThreshold: 10 });
    await el.updateComplete;
    const search = el.shadowRoot.querySelector('[role="searchbox"]');
    expect(search).toBeNull();
  });

  it('has role="region" with aria-label', async () => {
    const el = createElement();
    await el.updateComplete;
    const root = el.shadowRoot.querySelector('[role="region"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Node palette');
  });
});
