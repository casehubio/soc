import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './work-item-workbench';
import type { WorkItemWorkbench } from './work-item-workbench';
import type { WorkIdentity } from '@casehubio/mosaic-core';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

class EventSourceMock {
  url: string;
  withCredentials = false;
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  constructor(url: string, _config?: EventSourceInit) { this.url = url; }
  addEventListener(_type: string, _listener: EventListener) {}
  removeEventListener(_type: string, _listener: EventListener) {}
  dispatchEvent(_event: Event): boolean { return true; }
  close() {}
}
Object.defineProperty(global, 'EventSource', { value: EventSourceMock });

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, 'IntersectionObserver', { value: IntersectionObserverMock });

describe('WorkItemWorkbench', () => {
  let element: WorkItemWorkbench;
  const mockIdentity: WorkIdentity = {
    userId: 'user-1',
    displayName: 'Test User',
    groups: ['group-1', 'group-2'],
  };

  beforeEach(() => {
    element = document.createElement('agency-work-item-workbench') as WorkItemWorkbench;
    element.endpoint = 'http://localhost:8080/api';
    element.identity = mockIdentity;
  });

  afterEach(() => {
    element.remove();
    localStorage.clear();
  });

  describe('rendering', () => {
    it('renders shadow root', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      expect(element.shadowRoot).toBeTruthy();
    });

    it('renders split-workbench internally', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      const sw = element.shadowRoot!.querySelector('pages-split-workbench');
      expect(sw).toBeTruthy();
      expect(sw!.getAttribute('selection-topic')).toBe('work-item');
    });

    it('renders work-item-inbox in list slot', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      const inbox = element.shadowRoot!.querySelector('agency-work-item-inbox');
      expect(inbox).toBeTruthy();
      expect(inbox!.getAttribute('slot')).toBe('list');
    });

    it('renders work-item-detail in detail slot', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      const detail = element.shadowRoot!.querySelector('agency-work-item-detail');
      expect(detail).toBeTruthy();
      expect(detail!.getAttribute('slot')).toBe('detail');
    });

    it('renders keyboard hint bar', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.keyboard-hints')).toBeTruthy();
    });

    it('does not render Queues tab or queue-board', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      const tabs = element.shadowRoot!.querySelectorAll('.tab');
      const queueTab = Array.from(tabs).find(tab => tab.textContent?.includes('Queues'));
      expect(queueTab).toBeUndefined();
      expect(element.shadowRoot!.querySelector('queue-board')).toBeNull();
    });
  });

  describe('property passthrough', () => {
    it('passes endpoint to inbox and detail', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      const inbox = element.shadowRoot!.querySelector('agency-work-item-inbox') as any;
      const detail = element.shadowRoot!.querySelector('agency-work-item-detail') as any;
      expect(inbox?.endpoint).toBe('http://localhost:8080/api');
      expect(detail?.endpoint).toBe('http://localhost:8080/api');
    });

    it('passes identity to inbox and detail', async () => {
      document.body.appendChild(element);
      await element.updateComplete;
      const inbox = element.shadowRoot!.querySelector('agency-work-item-inbox') as any;
      const detail = element.shadowRoot!.querySelector('agency-work-item-detail') as any;
      expect(inbox?.identity?.userId).toBe('user-1');
      expect(detail?.identity?.userId).toBe('user-1');
    });
  });

  describe('configure() lifecycle', () => {
    it('accepts configure() before connectedCallback', () => {
      element.configure({
        endpoint: 'http://test-api.com',
        identity: mockIdentity,
      });
      expect(element.endpoint).toBe('http://test-api.com');
    });

    it('supports reconfigure after initial render', async () => {
      document.body.appendChild(element);
      element.configure({
        endpoint: 'http://new-api.com',
        identity: { ...mockIdentity, userId: 'user-2' },
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(element.endpoint).toBe('http://new-api.com');
      expect(element.identity.userId).toBe('user-2');
    });
  });
});
