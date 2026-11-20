import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitPagesEvent } from '@casehubio/pages-component';
import './split-workbench.js';

type SplitWorkbenchEl = HTMLElement & {
  selectionTopic: string;
  title: string;
  storageKey: string;
  updateComplete: Promise<boolean>;
};

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
  writable: true,
});

function createElement(topic = 'test'): SplitWorkbenchEl {
  const el = document.createElement('blocks-split-workbench') as SplitWorkbenchEl;
  el.selectionTopic = topic;
  return el;
}

describe('blocks-split-workbench', () => {
  let el: SplitWorkbenchEl;

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
    storage.clear();
  });

  describe('slot rendering', () => {
    it('renders list and detail slots', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('slot[name="list"]')).toBeTruthy();
      expect(el.shadowRoot!.querySelector('slot[name="detail"]')).toBeTruthy();
    });

    it('renders header slot', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('slot[name="header"]')).toBeTruthy();
    });

    it('renders title as header fallback', async () => {
      el = createElement();
      el.title = 'Test Workbench';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Test Workbench');
    });

    it('always renders both slots regardless of selection state', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('slot[name="list"]')).toBeTruthy();
      expect(el.shadowRoot!.querySelector('slot[name="detail"]')).toBeTruthy();
    });
  });

  describe('divider', () => {
    it('renders draggable divider with separator role', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      const divider = el.shadowRoot!.querySelector('[role="separator"]');
      expect(divider).toBeTruthy();
      expect(divider!.getAttribute('aria-orientation')).toBe('vertical');
      expect(divider!.getAttribute('aria-valuemin')).toBe('20');
      expect(divider!.getAttribute('aria-valuemax')).toBe('70');
    });

    it('adjusts divider position with ArrowRight', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      const divider = el.shadowRoot!.querySelector('[role="separator"]') as HTMLElement;
      const initial = Number(divider.getAttribute('aria-valuenow'));

      divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;

      expect(Number(divider.getAttribute('aria-valuenow'))).toBeGreaterThan(initial);
    });

    it('adjusts divider position with ArrowLeft', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      const divider = el.shadowRoot!.querySelector('[role="separator"]') as HTMLElement;
      const initial = Number(divider.getAttribute('aria-valuenow'));

      divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await el.updateComplete;

      expect(Number(divider.getAttribute('aria-valuenow'))).toBeLessThan(initial);
    });

    it('persists divider position to localStorage', async () => {
      el = createElement();
      el.storageKey = 'test-divider';
      document.body.appendChild(el);
      await el.updateComplete;

      const divider = el.shadowRoot!.querySelector('[role="separator"]') as HTMLElement;
      divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;

      expect(localStorage.getItem('test-divider')).toBeTruthy();
    });

    it('restores divider position from localStorage', async () => {
      localStorage.setItem('split-workbench-test-divider', '0.4');
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      const divider = el.shadowRoot!.querySelector('[role="separator"]') as HTMLElement;
      expect(divider.getAttribute('aria-valuenow')).toBe('40');
    });

    it('defaults storage-key from selection-topic', async () => {
      el = createElement('myapp');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.storageKey).toBe('split-workbench-myapp-divider');
    });
  });

  describe('selection events', () => {
    it('sets has-selection attribute on topic:selected', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      expect(el.hasAttribute('has-selection')).toBe(false);
      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;
      expect(el.hasAttribute('has-selection')).toBe(true);
    });

    it('removes has-selection attribute on topic:deselected', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;
      emitPagesEvent(document, 'test:deselected', {});
      await el.updateComplete;
      expect(el.hasAttribute('has-selection')).toBe(false);
    });

    it('does not respond to events from different topic', async () => {
      el = createElement('test');
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'other:selected', { id: '1' });
      await el.updateComplete;
      expect(el.hasAttribute('has-selection')).toBe(false);
    });
  });

  describe('back button', () => {
    it('renders back button when has-selection is true', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('[aria-label="Back to list"]')).toBeTruthy();
    });

    it('back button emits topic:deselected', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const events: unknown[] = [];
      document.addEventListener('pages-event', ((e: CustomEvent) => {
        if (e.detail?.topic === 'test:deselected') events.push(e.detail);
      }) as EventListener);

      const backBtn = el.shadowRoot!.querySelector('[aria-label="Back to list"]') as HTMLElement;
      backBtn.click();
      await el.updateComplete;

      expect(events.length).toBe(1);
      expect(el.hasAttribute('has-selection')).toBe(false);
    });
  });

  describe('multi-instance', () => {
    it('different topics are isolated', async () => {
      el = createElement('alpha');
      const el2 = createElement('beta');
      document.body.appendChild(el);
      document.body.appendChild(el2);
      await el.updateComplete;
      await el2.updateComplete;

      emitPagesEvent(document, 'alpha:selected', { id: '1' });
      await el.updateComplete;
      await el2.updateComplete;

      expect(el.hasAttribute('has-selection')).toBe(true);
      expect(el2.hasAttribute('has-selection')).toBe(false);
      el2.remove();
    });

    it('same topics share selection state', async () => {
      el = createElement('shared');
      const el2 = createElement('shared');
      document.body.appendChild(el);
      document.body.appendChild(el2);
      await el.updateComplete;
      await el2.updateComplete;

      emitPagesEvent(document, 'shared:selected', { id: '1' });
      await el.updateComplete;
      await el2.updateComplete;

      expect(el.hasAttribute('has-selection')).toBe(true);
      expect(el2.hasAttribute('has-selection')).toBe(true);
      el2.remove();
    });
  });

  describe('accessibility', () => {
    it('renders list and detail panels with region roles', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      const regions = el.shadowRoot!.querySelectorAll('[role="region"]');
      const labels = Array.from(regions).map(r => r.getAttribute('aria-label'));
      expect(labels).toContain('List');
      expect(labels).toContain('Detail');
    });
  });

  describe('validation', () => {
    it('warns when selection-topic is not set', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      el = document.createElement('blocks-split-workbench') as SplitWorkbenchEl;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('selection-topic'));
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from events on disconnect', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      el.remove();
      emitPagesEvent(document, 'test:selected', { id: '1' });
      await new Promise(r => setTimeout(r, 0));
      expect(el.hasAttribute('has-selection')).toBe(false);
    });
  });
});
