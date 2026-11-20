import { describe, it, expect, beforeEach } from 'vitest';
import './pages-prompt-editor.js';
import './pages-json-viewer.js';

describe('PagesPromptEditor', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('registers as custom element', () => {
    expect(customElements.get('pages-prompt-editor')).toBeDefined();
  });

  it('creates an element', () => {
    const el = document.createElement('pages-prompt-editor');
    document.body.appendChild(el);
    expect(el).toBeInstanceOf(HTMLElement);
  });
});

describe('PagesJsonViewer', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('registers as custom element', () => {
    expect(customElements.get('pages-json-viewer')).toBeDefined();
  });

  it('creates an element', () => {
    const el = document.createElement('pages-json-viewer');
    document.body.appendChild(el);
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
