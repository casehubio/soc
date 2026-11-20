import { describe, it, expect, afterEach } from 'vitest';
import './context-gauge.js';
import './doc-picker.js';
import './brainstorm-options.js';
import './brainstorm-picker.js';
import './workspace-status.js';

afterEach(() => { document.body.innerHTML = ''; });

describe('context-gauge', () => {
  it('renders without errors', async () => {
    const el = document.createElement('context-gauge') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot).toBeTruthy();
  });

  it('shows gauge bar', async () => {
    const el = document.createElement('context-gauge') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    const bar = el.shadowRoot!.querySelector('.gauge-bar');
    expect(bar).toBeTruthy();
  });
});

describe('doc-picker', () => {
  it('renders without errors', async () => {
    const el = document.createElement('doc-picker') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot).toBeTruthy();
  });

  it('accepts apiBaseUrl property', async () => {
    const el = document.createElement('doc-picker') as any;
    el.apiBaseUrl = 'http://localhost:9001';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.apiBaseUrl).toBe('http://localhost:9001');
  });

  it('defaults apiBaseUrl to empty string', async () => {
    const el = document.createElement('doc-picker') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.apiBaseUrl).toBe('');
  });
});

describe('brainstorm-options', () => {
  it('renders empty state', async () => {
    const el = document.createElement('brainstorm-options') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    const empty = el.shadowRoot!.querySelector('.empty');
    expect(empty).toBeTruthy();
    expect(empty!.textContent).toContain('Waiting');
  });

  it('renders option cards', async () => {
    const el = document.createElement('brainstorm-options') as any;
    el.configure({ sessionId: 'test-session' });
    el._options = [
      { id: 'o1', title: 'Option A', description: 'Desc A', tradeoffs: 'Trade A', status: 'ACTIVE' },
      { id: 'o2', title: 'Option B', description: 'Desc B', tradeoffs: 'Trade B', status: 'RECOMMENDED' },
    ];
    document.body.appendChild(el);
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('.card');
    expect(cards.length).toBe(2);
  });

  it('accepts apiBaseUrl property', async () => {
    const el = document.createElement('brainstorm-options') as any;
    el.apiBaseUrl = 'http://localhost:9001';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.apiBaseUrl).toBe('http://localhost:9001');
  });
});

describe('brainstorm-picker', () => {
  it('renders nothing when no sessions', async () => {
    const el = document.createElement('brainstorm-picker') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.badge')).toBeFalsy();
  });
});

describe('workspace-status', () => {
  it('renders without errors', async () => {
    const el = document.createElement('workspace-status') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot).toBeTruthy();
  });
});
