import { describe, it, expect, beforeEach } from 'vitest';
import './pages-status-badge.js';

describe('PagesStatusBadge', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('registers as custom element', () => {
    expect(customElements.get('pages-status-badge')).toBeDefined();
  });

  it('creates an element', () => {
    const el = document.createElement('pages-status-badge');
    document.body.appendChild(el);
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
