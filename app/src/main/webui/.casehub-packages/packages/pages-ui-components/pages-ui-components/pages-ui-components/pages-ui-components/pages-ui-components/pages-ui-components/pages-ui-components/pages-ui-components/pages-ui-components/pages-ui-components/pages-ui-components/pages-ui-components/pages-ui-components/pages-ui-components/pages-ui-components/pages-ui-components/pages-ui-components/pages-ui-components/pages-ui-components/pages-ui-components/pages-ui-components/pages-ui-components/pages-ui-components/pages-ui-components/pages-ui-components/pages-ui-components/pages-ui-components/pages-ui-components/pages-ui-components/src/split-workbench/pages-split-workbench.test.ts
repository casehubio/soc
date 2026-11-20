import { describe, it, expect, beforeEach } from 'vitest';
import './pages-split-workbench.js';

describe('PagesSplitWorkbench', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('registers as custom element', () => {
    expect(customElements.get('pages-split-workbench')).toBeDefined();
  });

  it('creates an element', () => {
    const el = document.createElement('pages-split-workbench');
    document.body.appendChild(el);
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
