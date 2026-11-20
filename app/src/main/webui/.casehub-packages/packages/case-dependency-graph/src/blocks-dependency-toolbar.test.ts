import { describe, it, expect, afterEach } from 'vitest';
import './blocks-dependency-toolbar.js';

describe('blocks-dependency-toolbar', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('registers as a custom element', () => {
    expect(customElements.get('blocks-dependency-toolbar')).toBeDefined();
  });

  it('sets role="toolbar" and aria-label on connect', async () => {
    const el = document.createElement('blocks-dependency-toolbar');
    document.body.appendChild(el);
    expect(el.getAttribute('role')).toBe('toolbar');
    expect(el.getAttribute('aria-label')).toBe('Dependency graph filters');
  });

  it('renders edge type checkboxes', async () => {
    const el = document.createElement('blocks-dependency-toolbar') as any;
    el.edgeTypes = [
      { type: 'parent_child', count: 3 },
      { type: 'supersedes', count: 1 },
    ];
    el.selectedTypes = new Set(['parent_child', 'supersedes']);
    el.nodeCount = 5;
    el.edgeCount = 4;
    document.body.appendChild(el);
    await el.updateComplete;

    const checkboxes = el.shadowRoot!.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });

  it('renders stats', async () => {
    const el = document.createElement('blocks-dependency-toolbar') as any;
    el.edgeTypes = [];
    el.selectedTypes = new Set();
    el.nodeCount = 12;
    el.edgeCount = 15;
    document.body.appendChild(el);
    await el.updateComplete;

    const text = el.shadowRoot!.textContent;
    expect(text).toContain('12');
    expect(text).toContain('15');
  });

  it('renders refresh and export buttons', async () => {
    const el = document.createElement('blocks-dependency-toolbar') as any;
    el.edgeTypes = [];
    el.selectedTypes = new Set();
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot!.querySelectorAll('button');
    const labels = Array.from(buttons).map((b: Element) => b.textContent?.trim());
    expect(labels).toContain('Refresh');
    expect(labels).toContain('Export DOT');
  });
});
