import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventConnection } from '@casehubio/pages-data';
import './scenario-narrative.js';
import type { PagesScenarioNarrative } from './scenario-narrative.js';

function mockConnection(): EventConnection {
  return {
    listen: vi.fn().mockResolvedValue({ topics: ['scenario:state'] }),
    unlisten: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    close: vi.fn(),
    connected: true,
    status: 'connected' as const,
  };
}

function fireStateEvent(target: EventTarget, payload: Record<string, unknown>): void {
  target.dispatchEvent(new CustomEvent('pages-event', {
    detail: { topic: 'scenario:state', payload },
  }));
}

const idleState = { scenario: null, chapter: null, section: null, step: null, paused: false, speed: 1.0, progress: 0, content: null, slides: null };

describe('pages-scenario-narrative', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(idleState),
    }));
  });

  it('registers as custom element', () => {
    expect(customElements.get('pages-scenario-narrative')).toBeDefined();
  });

  it('renders nothing when content is null', async () => {
    const el = document.createElement('pages-scenario-narrative') as PagesScenarioNarrative;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.narrative-content')).toBeNull();
    el.remove();
  });

  it('renders inline markdown content', async () => {
    const el = document.createElement('pages-scenario-narrative') as PagesScenarioNarrative;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      ...idleState,
      scenario: 'test',
      content: { type: 'inline', markdown: '# Hello\n\nThis is a **bold** paragraph.' },
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    const content = el.shadowRoot?.querySelector('.narrative-content');
    expect(content).not.toBeNull();
    expect(content?.querySelector('h1')?.textContent).toBe('Hello');
    expect(content?.querySelector('strong')?.textContent).toBe('bold');
    el.remove();
  });

  it('sanitizes HTML in markdown to prevent XSS', async () => {
    const el = document.createElement('pages-scenario-narrative') as PagesScenarioNarrative;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      ...idleState,
      scenario: 'test',
      content: { type: 'inline', markdown: '<script>alert(1)</script>' },
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    const content = el.shadowRoot?.querySelector('.narrative-content');
    expect(content?.querySelector('script')).toBeNull();
    expect(content?.innerHTML).toContain('&lt;script&gt;');
    el.remove();
  });

  it('renders slide reference', async () => {
    const el = document.createElement('pages-scenario-narrative') as PagesScenarioNarrative;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      ...idleState,
      scenario: 'test',
      content: { type: 'slide', ref: 'slide-3' },
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    expect(el.shadowRoot?.textContent).toContain('Slide: slide-3');
    el.remove();
  });

  it('clears content when scenario ends', async () => {
    const el = document.createElement('pages-scenario-narrative') as PagesScenarioNarrative;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      ...idleState,
      scenario: 'test',
      content: { type: 'inline', markdown: '# Hello' },
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.narrative-content')).not.toBeNull();

    fireStateEvent(target, idleState);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.narrative-content')).toBeNull();
    el.remove();
  });
});
