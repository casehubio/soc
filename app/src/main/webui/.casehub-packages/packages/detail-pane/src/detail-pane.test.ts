import { describe, it, expect, vi, afterEach } from 'vitest';
import { emitPagesEvent } from '@casehubio/pages-data';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TabDefinition } from './types.js';
import './detail-pane.js';

@customElement('test-tab-panel')
class TestTabPanel extends LitElement {
  @property({ attribute: false }) item: any;
  override render() {
    return html`<div class="tab-content">${this.item ? `Item: ${this.item.id}` : 'No item'}</div>`;
  }
}

type DetailPaneEl = HTMLElement & {
  tabs: TabDefinition[];
  selectionTopic: string;
  emptyMessage: string;
  updateComplete: Promise<boolean>;
};

const testTabs: TabDefinition[] = [
  { id: 'overview', label: 'Overview', tagName: 'test-tab-panel', order: 0 },
  { id: 'details', label: 'Details', tagName: 'test-tab-panel', order: 10 },
];

function createElement(topic = 'test'): DetailPaneEl {
  const el = document.createElement('agency-detail-pane') as DetailPaneEl;
  el.selectionTopic = topic;
  el.tabs = testTabs;
  return el;
}

describe('agency-detail-pane', () => {
  let el: DetailPaneEl;

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
  });

  describe('empty state', () => {
    it('shows empty message when no item selected', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Select an item to view details');
    });

    it('shows custom empty message', async () => {
      el = createElement();
      el.emptyMessage = 'Pick something';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.textContent).toContain('Pick something');
    });

    it('empty state has role=status', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('[role="status"]')).toBeTruthy();
    });
  });

  describe('selection', () => {
    it('shows tabs when item is selected via event', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1', name: 'Test' });
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(2);
      const labels = Array.from(tabs).map(t => t.textContent!.trim());
      expect(labels).toContain('Overview');
      expect(labels).toContain('Details');
    });

    it('creates tab element and sets item property', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      const payload = { id: '1', name: 'Test' };
      emitPagesEvent(document, 'test:selected', payload);
      await el.updateComplete;

      const panel = el.shadowRoot!.querySelector('test-tab-panel') as any;
      expect(panel).toBeTruthy();
      expect(panel.item).toEqual(payload);
    });

    it('clears content on deselection', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      emitPagesEvent(document, 'test:deselected', {});
      await el.updateComplete;

      expect(el.shadowRoot!.textContent).toContain('Select an item to view details');
    });

    it('updates item when selection changes', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1', name: 'First' });
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '2', name: 'Second' });
      await el.updateComplete;

      const panel = el.shadowRoot!.querySelector('test-tab-panel') as any;
      expect(panel.item.name).toBe('Second');
    });
  });

  describe('tab switching', () => {
    it('switches active tab when clicked', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
      expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');

      tabs[1]!.click();
      await el.updateComplete;

      expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    });

    it('passes item to newly active tab', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      const payload = { id: '1', name: 'Test' };
      emitPagesEvent(document, 'test:selected', payload);
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
      tabs[1]!.click();
      await el.updateComplete;

      const panel = el.shadowRoot!.querySelector('[role="tabpanel"] test-tab-panel') as any;
      expect(panel?.item).toEqual(payload);
    });
  });

  describe('tab ordering', () => {
    it('sorts tabs by order property', async () => {
      el = createElement();
      el.tabs = [
        { id: 'b', label: 'Second', tagName: 'test-tab-panel', order: 20 },
        { id: 'a', label: 'First', tagName: 'test-tab-panel', order: 5 },
      ];
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      expect(tabs[0]!.textContent!.trim()).toBe('First');
      expect(tabs[1]!.textContent!.trim()).toBe('Second');
    });

    it('uses array order when no order property specified', async () => {
      el = createElement();
      el.tabs = [
        { id: 'z', label: 'Zebra', tagName: 'test-tab-panel' },
        { id: 'a', label: 'Apple', tagName: 'test-tab-panel' },
      ];
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      expect(tabs[0]!.textContent!.trim()).toBe('Zebra');
      expect(tabs[1]!.textContent!.trim()).toBe('Apple');
    });
  });

  describe('badges', () => {
    it('renders badge from badge function', async () => {
      el = createElement();
      el.tabs = [
        { id: 'a', label: 'Overview', tagName: 'test-tab-panel', badge: (item: any) => item?.count ? `${item.count}` : null },
      ];
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1', count: 5 });
      await el.updateComplete;

      expect(el.shadowRoot!.textContent).toContain('5');
    });

    it('does not render badge when function returns null', async () => {
      el = createElement();
      el.tabs = [
        { id: 'a', label: 'Overview', tagName: 'test-tab-panel', badge: () => null },
      ];
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('.badge')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('renders tablist role', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('[role="tablist"]')).toBeTruthy();
    });

    it('renders tabpanel role', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('[role="tabpanel"]')).toBeTruthy();
    });

    it('host has tabindex -1', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('navigates tabs with ArrowRight', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
      tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;

      expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    });

    it('navigates tabs with ArrowLeft (wraps)', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
      tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await el.updateComplete;

      expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('isolation', () => {
    it('does not respond to events from different topic', async () => {
      el = createElement('test');
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'other:selected', { id: '1' });
      await el.updateComplete;

      expect(el.shadowRoot!.textContent).toContain('Select an item to view details');
    });
  });

  describe('lazy creation and caching', () => {
    it('caches tab elements across tab switches', async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;

      emitPagesEvent(document, 'test:selected', { id: '1' });
      await el.updateComplete;

      const firstPanel = el.shadowRoot!.querySelector('test-tab-panel');

      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
      tabs[1]!.click();
      await el.updateComplete;
      tabs[0]!.click();
      await el.updateComplete;

      const samePanel = el.shadowRoot!.querySelector('test-tab-panel');
      expect(samePanel).toBe(firstPanel);
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
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('[role="tab"]')).toBeNull();
    });
  });

  describe('renderContent callback', () => {
    it('renders content from renderContent callback when present', async () => {
      el = document.createElement('agency-detail-pane') as DetailPaneEl;
      el.tabs = [
        {
          id: 'custom', label: 'Custom', tagName: 'div', order: 0,
          renderContent: () => html`<div class="callback-content">Rendered via callback</div>`,
        },
      ];
      (el as any).standalone = true;
      document.body.appendChild(el);
      await el.updateComplete;

      const panel = el.shadowRoot!.querySelector('[role="tabpanel"]');
      expect(panel!.innerHTML).toContain('callback-content');
      expect(panel!.textContent).toContain('Rendered via callback');
    });

    it('falls back to tagName when renderContent is absent', async () => {
      el = document.createElement('agency-detail-pane') as DetailPaneEl;
      el.tabs = [
        { id: 'fallback', label: 'Fallback', tagName: 'test-tab-panel', order: 0 },
      ];
      (el as any).standalone = true;
      document.body.appendChild(el);
      await el.updateComplete;

      const panel = el.shadowRoot!.querySelector('[role="tabpanel"]');
      const child = panel!.querySelector('test-tab-panel');
      expect(child).not.toBeNull();
    });

    it('passes item to renderContent callback', async () => {
      let receivedItem: unknown = null;
      el = document.createElement('agency-detail-pane') as DetailPaneEl;
      el.tabs = [
        {
          id: 'custom', label: 'Custom', tagName: 'div', order: 0,
          renderContent: (item: unknown) => {
            receivedItem = item;
            return html`<div>Content</div>`;
          },
        },
      ];
      el.selectionTopic = 'test-rc';
      document.body.appendChild(el);
      await el.updateComplete;

      const payload = { id: '1', name: 'Test' };
      emitPagesEvent(document, 'test-rc:selected', payload);
      await el.updateComplete;

      expect(receivedItem).toEqual(payload);
    });
  });

  describe('standalone mode', () => {
    it('renders tabs without selection when standalone is true', async () => {
      el = document.createElement('agency-detail-pane') as DetailPaneEl;
      (el as any).standalone = true;
      el.tabs = testTabs;
      document.body.appendChild(el);
      await el.updateComplete;
      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(2);
      const empty = el.shadowRoot!.querySelector('.empty');
      expect(empty).toBeNull();
    });

    it('activates first tab in standalone mode', async () => {
      el = document.createElement('agency-detail-pane') as DetailPaneEl;
      (el as any).standalone = true;
      el.tabs = testTabs;
      document.body.appendChild(el);
      await el.updateComplete;
      const activeTab = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]');
      expect(activeTab).not.toBeNull();
      expect(activeTab!.textContent).toContain('Overview');
    });
  });
});
