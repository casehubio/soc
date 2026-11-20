import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventConnection } from '@casehubio/pages-data';
import './scenario-controller.js';
import './scenario-yaml-viewer.js';
import type { PagesScenarioController } from './scenario-controller.js';

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

describe('pages-scenario-controller', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ scenario: null, chapter: null, section: null, step: null, paused: false, speed: 1.0, progress: 0, content: null, slides: null }),
    }));
  });

  it('registers as custom element', () => {
    expect(customElements.get('pages-scenario-controller')).toBeDefined();
  });

  it('renders error when no connection configured', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot?.textContent).toContain('No connection configured');
    el.remove();
  });

  it('renders idle state with connection', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot?.textContent).toContain('No scenario running');
    expect(el.shadowRoot?.textContent).toContain('Idle');
    expect(conn.listen).toHaveBeenCalledWith(['scenario:state']);
    el.remove();
  });

  it('updates state from scenario:state event', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;

    const outlineData = [
      { label: 'Ch1', target: null, children: [
        { label: 'Step 1', target: 'browser', children: [] },
      ]},
    ];
    const idleState = { scenario: null, chapter: null, section: null, step: null, paused: false, speed: 1.0, progress: 0, content: null, slides: null };

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/scenario/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(outlineData) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(idleState) });
    }));

    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      scenario: 'test-demo', chapter: 'Ch1', section: 'S1',
      step: 'Step 1', paused: false, speed: 1.0, progress: 0.25,
      content: null, slides: null,
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    expect(el.shadowRoot?.textContent).toContain('Step 1');
    expect(el.shadowRoot?.textContent).toContain('25%');
    el.remove();
  });

  it('sends pause command on button click', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;

    const idleState = { scenario: null, chapter: null, section: null, step: null, paused: false, speed: 1.0, progress: 0, content: null, slides: null };
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/scenario/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(idleState) });
    }));

    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      scenario: 'test', chapter: null, section: null,
      step: 'S1', paused: false, speed: 1.0, progress: 0,
      content: null, slides: null,
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    const pauseBtn = el.shadowRoot?.querySelector('button[aria-label="Pause"]') as HTMLButtonElement;
    expect(pauseBtn).not.toBeNull();
    pauseBtn.click();

    await new Promise(r => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/scenario/pause'),
      expect.objectContaining({ method: 'POST' }),
    );
    el.remove();
  });

  it('shows resume button when paused', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    document.body.appendChild(el);
    await el.updateComplete;

    fireStateEvent(target, {
      scenario: 'test', chapter: null, section: null,
      step: 'S1', paused: true, speed: 1.0, progress: 0,
      content: null, slides: null,
    });
    await el.updateComplete;

    const resumeBtn = el.shadowRoot?.querySelector('button[aria-label="Resume"]');
    expect(resumeBtn).toBeDefined();
    el.remove();
  });

  it('disables buttons when no scenario active', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    document.body.appendChild(el);
    await el.updateComplete;

    const transportBtns = el.shadowRoot?.querySelectorAll('.transport button');
    transportBtns?.forEach(btn => {
      expect(btn.disabled).toBe(true);
    });
    el.remove();
  });

  it('space key toggles play/pause', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;

    const idleState = { scenario: null, chapter: null, section: null, step: null, paused: false, speed: 1.0, progress: 0, content: null, slides: null };
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/scenario/outline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(idleState) });
    }));

    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));

    fireStateEvent(target, {
      scenario: 'test', chapter: null, section: null,
      step: 'S1', paused: false, speed: 1.0, progress: 0,
      content: null, slides: null,
    });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    await new Promise(r => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/scenario/pause'),
      expect.objectContaining({ method: 'POST' }),
    );
    el.remove();
  });

  it('renders source toggle button in compact card', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    el.mode = 'compact';
    el.baseUrl = 'http://localhost:8080';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    document.body.appendChild(el);
    await el.updateComplete;
    (el as any)._expanded = true;
    await el.updateComplete;
    const btn = el.shadowRoot?.querySelector('[aria-label="Toggle source"]');
    expect(btn).not.toBeNull();
    el.remove();
  });

  it('creates yaml viewer on toggle and sets snapped state', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    el.mode = 'compact';
    el.baseUrl = 'http://localhost:8080';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    document.body.appendChild(el);
    await el.updateComplete;
    (el as any)._expanded = true;
    await el.updateComplete;

    const toggleBtn = el.shadowRoot?.querySelector('[aria-label="Toggle source"]') as HTMLButtonElement;
    toggleBtn.click();
    await el.updateComplete;

    const viewer = document.querySelector('pages-scenario-yaml-viewer');
    expect(viewer).not.toBeNull();
    expect((el as any)._docked).toBe(true);
    expect((el as any)._yamlOpen).toBe(true);

    toggleBtn.click();
    await el.updateComplete;
    expect(viewer?.style.display).toBe('none');
    expect((el as any)._yamlOpen).toBe(false);

    el.remove();
    viewer?.remove();
  });

  it('shows undock button when yaml viewer is open and docked', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    el.mode = 'compact';
    el.baseUrl = 'http://localhost:8080';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    document.body.appendChild(el);
    await el.updateComplete;
    (el as any)._expanded = true;
    await el.updateComplete;

    const toggleBtn = el.shadowRoot?.querySelector('[aria-label="Toggle source"]') as HTMLButtonElement;
    toggleBtn.click();
    await el.updateComplete;

    const undockBtn = el.shadowRoot?.querySelector('[aria-label="Undock viewer"]');
    expect(undockBtn).not.toBeNull();

    undockBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect((el as any)._docked).toBe(false);

    const undockBtnAfter = el.shadowRoot?.querySelector('[aria-label="Undock viewer"]');
    expect(undockBtnAfter).toBeNull();

    const dockBtn = el.shadowRoot?.querySelector('[aria-label="Dock viewer"]');
    expect(dockBtn).not.toBeNull();

    el.remove();
    document.querySelector('pages-scenario-yaml-viewer')?.remove();
  });

  it('re-docks viewer when dock button clicked', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    el.mode = 'compact';
    el.baseUrl = 'http://localhost:8080';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    document.body.appendChild(el);
    await el.updateComplete;
    (el as any)._expanded = true;
    await el.updateComplete;

    const toggleBtn = el.shadowRoot?.querySelector('[aria-label="Toggle source"]') as HTMLButtonElement;
    toggleBtn.click();
    await el.updateComplete;

    (el as any)._docked = false;
    await el.updateComplete;

    const dockBtn = el.shadowRoot?.querySelector('[aria-label="Dock viewer"]') as HTMLButtonElement;
    expect(dockBtn).not.toBeNull();
    dockBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;

    expect((el as any)._docked).toBe(true);

    el.remove();
    document.querySelector('pages-scenario-yaml-viewer')?.remove();
  });

  describe('compact mode viewport positioning', () => {
    it('clears inline drag position on window resize when off-screen', async () => {
      const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
      el.mode = 'compact';
      el.baseUrl = 'http://localhost:8080';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
      document.body.appendChild(el);
      await el.updateComplete;

      el.style.left = '2000px';
      el.style.top = '2000px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';

      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
        { left: 2000, top: 2000, right: 2280, bottom: 2200, width: 280, height: 200, x: 2000, y: 2000, toJSON: () => ({}) });

      window.dispatchEvent(new Event('resize'));

      expect(el.style.left).toBe('');
      expect(el.style.top).toBe('');
      el.remove();
    });

    it('preserves inline position on resize when still within viewport', async () => {
      const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
      el.mode = 'compact';
      el.baseUrl = 'http://localhost:8080';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
      document.body.appendChild(el);
      await el.updateComplete;

      el.style.left = '100px';
      el.style.top = '100px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';

      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
        { left: 100, top: 100, right: 380, bottom: 300, width: 280, height: 200, x: 100, y: 100, toJSON: () => ({}) });

      window.dispatchEvent(new Event('resize'));

      expect(el.style.left).toBe('100px');
      expect(el.style.top).toBe('100px');
      el.remove();
    });

    it('resets inline position when expanding from pill to card', async () => {
      const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
      el.mode = 'compact';
      el.baseUrl = 'http://localhost:8080';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
      document.body.appendChild(el);
      await el.updateComplete;

      el.style.left = '500px';
      el.style.top = '500px';

      (el as any)._expanded = true;
      (el as any)._resetPosition();
      await el.updateComplete;

      expect(el.style.left).toBe('');
      expect(el.style.top).toBe('');
      el.remove();
    });

    it('resets inline position when collapsing from card to pill', async () => {
      const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
      el.mode = 'compact';
      el.baseUrl = 'http://localhost:8080';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
      document.body.appendChild(el);
      await el.updateComplete;
      (el as any)._expanded = true;
      await el.updateComplete;

      el.style.left = '300px';
      el.style.top = '200px';

      (el as any)._expanded = false;
      (el as any)._resetPosition();
      await el.updateComplete;

      expect(el.style.left).toBe('');
      expect(el.style.top).toBe('');
      el.remove();
    });

    it('removes resize listener on disconnect', async () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
      el.mode = 'compact';
      el.baseUrl = 'http://localhost:8080';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
      document.body.appendChild(el);
      await el.updateComplete;
      el.remove();
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  it('cleans up on disconnect', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    document.body.appendChild(el);
    await el.updateComplete;
    el.remove();

    expect(conn.unlisten).toHaveBeenCalledWith(['scenario:state']);
  });

  it('renders type icon for spotlight step', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));

    fireStateEvent(target, { scenario: 'test', step: null, paused: false, speed: 1, progress: 0, content: null, slides: null });
    await el.updateComplete;
    (el as any)._outline = [{
      label: 'Section', target: null, children: [
        { label: 'Spotlight the form', target: 'browser', action: 'spotlight', children: [] },
      ],
    }];
    await el.updateComplete;

    const icon = el.shadowRoot!.querySelector('.step-type-icon');
    expect(icon).not.toBeNull();
    expect(icon!.textContent.trim()).toBe('◎');
    el.remove();
  });

  it('toggles library view in full mode', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    el.baseUrl = 'http://localhost:8080';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    document.body.appendChild(el);
    await el.updateComplete;

    const libraryBtn = el.shadowRoot?.querySelector('[aria-label="Toggle library"]') as HTMLButtonElement;
    expect(libraryBtn).not.toBeNull();

    libraryBtn.click();
    await el.updateComplete;

    const libraryView = el.shadowRoot?.querySelector('pages-library-view');
    expect(libraryView).not.toBeNull();

    libraryBtn.click();
    await el.updateComplete;

    const libraryViewAfter = el.shadowRoot?.querySelector('pages-library-view');
    expect(libraryViewAfter).toBeNull();

    el.remove();
  });

  it('starts scenario when script selected from library', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;

    const fetchCalls = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(function(url, opts) {
      fetchCalls.push({ url: url, opts: opts });
      if (url.includes('/yaml')) {
        return Promise.resolve({ ok: true, text: function() { return Promise.resolve('scenario: test-script\nsteps: []'); } });
      }
      return Promise.resolve({ ok: true, json: function() { return Promise.resolve({}); } });
    }));

    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(function(r) { setTimeout(r, 20); });

    (el as any)._view = 'library';
    await el.updateComplete;

    const libraryView = el.shadowRoot?.querySelector('pages-library-view');
    expect(libraryView).not.toBeNull();

    libraryView?.dispatchEvent(new CustomEvent('script-selected', {
      detail: { name: 'test-script' },
      bubbles: true,
      composed: true,
    }));

    await el.updateComplete;
    await new Promise(function(r) { setTimeout(r, 50); });

    expect(fetchCalls.some(function(c) { return c.url.includes('/scenario/library/test-script/yaml'); })).toBe(true);
    expect(fetchCalls.some(function(c) { return c.url.includes('/scenario/start'); })).toBe(true);

    expect((el as any)._view).toBe('outline');
    el.remove();
  });

  it('emits script-selected without connection for external handling', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    el.baseUrl = 'http://localhost:8080';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: function() { return Promise.resolve([]); } }));

    document.body.appendChild(el);
    await el.updateComplete;

    (el as any)._view = 'library';
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('script-selected', handler);

    const libraryView = el.shadowRoot?.querySelector('pages-library-view');
    libraryView?.dispatchEvent(new CustomEvent('script-selected', {
      detail: { name: 'some-script' },
      bubbles: true,
      composed: true,
    }));

    await el.updateComplete;
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.name).toBe('some-script');
    el.remove();
  });

  it('renders no type icon for unknown action', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const conn = mockConnection();
    const target = new EventTarget();
    el.connection = conn;
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));

    fireStateEvent(target, { scenario: 'test', step: null, paused: false, speed: 1, progress: 0, content: null, slides: null });
    await el.updateComplete;
    (el as any)._outline = [{
      label: 'Section', target: null, children: [
        { label: 'Wait for data', target: 'browser', action: 'wait', children: [] },
      ],
    }];
    await el.updateComplete;

    const icon = el.shadowRoot!.querySelector('.step-type-icon');
    expect(icon).toBeNull();
    el.remove();
  });

  it('marks slides-only sections completed when current step is in a later section', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const target = new EventTarget();
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;

    (el as any)._outline = [
      { label: 'Introduction', target: null, children: [] },
      { label: 'YAML Structure', target: null, children: [] },
      { label: 'ARIA Commands: fill', target: null, children: [
        { label: 'fill-textbox-FullName', target: null, action: 'fill', children: [] },
      ]},
      { label: 'Recap', target: null, children: [] },
    ];

    fireStateEvent(target, {
      scenario: 'tutorial', chapter: 'Tutorial', section: 'ARIA Commands: fill',
      step: 'fill-textbox-FullName', paused: true, speed: 1, progress: 0.5,
      content: null, slides: null,
    });
    await el.updateComplete;

    const headings = el.shadowRoot!.querySelectorAll('.outline-step, .outline-heading');
    const introEl = Array.from(headings).find(h => h.textContent.includes('Introduction'));
    const yamlEl = Array.from(headings).find(h => h.textContent.includes('YAML Structure'));
    const recapEl = Array.from(headings).find(h => h.textContent.includes('Recap'));

    expect(introEl?.classList.contains('completed')).toBe(true);
    expect(yamlEl?.classList.contains('completed')).toBe(true);
    expect(recapEl?.classList.contains('completed')).toBe(false);
    el.remove();
  });

  it('marks child steps of completed sections as completed when on a slides-only section', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const target = new EventTarget();
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;

    (el as any)._outline = [
      { label: 'Introduction', target: null, children: [] },
      { label: 'ARIA Commands: fill', target: null, children: [
        { label: 'fill-textbox-FullName', target: null, action: 'fill', children: [] },
      ]},
      { label: 'Recap', target: null, children: [] },
    ];

    fireStateEvent(target, {
      scenario: 'tutorial', chapter: 'Tutorial', section: 'Recap',
      step: null, paused: true, speed: 1, progress: 1.0,
      content: null, slides: null,
    });
    await el.updateComplete;

    const allItems = el.shadowRoot!.querySelectorAll('.outline-step, .outline-heading');
    const fillStep = Array.from(allItems).find(h => h.textContent.includes('fill-textbox-FullName'));
    const fillSection = Array.from(allItems).find(h => h.textContent.includes('ARIA Commands: fill'));

    expect(fillSection?.classList.contains('completed')).toBe(true);
    expect(fillStep?.classList.contains('completed')).toBe(true);
    el.remove();
  });

  it('marks slides-only leaf section as current when step is null', async () => {
    const el = document.createElement('pages-scenario-controller') as PagesScenarioController;
    const target = new EventTarget();
    el.eventTarget = target;
    document.body.appendChild(el);
    await el.updateComplete;

    (el as any)._outline = [
      { label: 'Introduction', target: null, children: [] },
      { label: 'ARIA Commands: fill', target: null, children: [
        { label: 'fill-textbox-FullName', target: null, action: 'fill', children: [] },
      ]},
      { label: 'Recap', target: null, children: [] },
    ];

    fireStateEvent(target, {
      scenario: 'tutorial', chapter: 'Tutorial', section: 'Recap',
      step: null, paused: true, speed: 1, progress: 1.0,
      content: null, slides: null,
    });
    await el.updateComplete;

    const allItems = el.shadowRoot!.querySelectorAll('.outline-step, .outline-heading');
    const recapEl = Array.from(allItems).find(h => h.textContent.includes('Recap'));

    expect(recapEl?.classList.contains('current')).toBe(true);
    el.remove();
  });
});
