import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, 'IntersectionObserver', { value: IntersectionObserverMock });

import './contributor-workbench.js';
import type { ContributorDetail } from './types.js';

type ContributorWorkbenchEl = HTMLElement & {
  endpoint: string;
  actorId: string;
  _detail: ContributorDetail | null;
  _loading: boolean;
  _error: string | null;
  updateComplete: Promise<boolean>;
};

const SAMPLE_DETAIL: ContributorDetail = {
  actorId: 'contributor-1',
  globalScore: 0.78,
  capabilityScores: { 'pr-contribution': 0.78 },
  dimensionScores: { 'merge-rate': 0.85, 'first-attempt-quality': 0.72 },
  intakeClassification: {
    lane: 'FAST_TRACK',
    trustScore: 0.78,
    observationCount: 15,
    classificationReason: 'score 0.78 >= fast-track threshold 0.75 with 15 observations',
    fastTrackThreshold: 0.75,
    standardThreshold: 0.50,
  },
  recentOutcomes: [
    { repo: 'casehubio/devtown', prNumber: 42, outcome: 'MERGED', occurredAt: '2026-08-01T10:00:00Z' },
    { repo: 'casehubio/devtown', prNumber: 38, outcome: 'REJECTED', occurredAt: '2026-07-28T09:00:00Z' },
  ],
};

let originalFetch: typeof globalThis.fetch;

describe('agency-contributor-workbench', () => {
  let el: ContributorWorkbenchEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_DETAIL), { status: 200 })
    ) as unknown as typeof fetch;
    el = document.createElement('agency-contributor-workbench') as ContributorWorkbenchEl;
    el.endpoint = '/api/governance';
    el.actorId = 'contributor-1';
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  describe('rendering', () => {
    it('renders shadow root', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot).toBeTruthy();
    });

    it('renders split-workbench', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._detail).toBeTruthy(), { timeout: 2000 });
      await el.updateComplete;
      const sw = el.shadowRoot!.querySelector('pages-split-workbench');
      expect(sw).toBeTruthy();
    });

    it('renders nothing when actorId is empty', async () => {
      el.actorId = '';
      document.body.appendChild(el);
      await el.updateComplete;
      const workbench = el.shadowRoot!.querySelector('pages-split-workbench');
      expect(workbench).toBeNull();
    });

    it('renders intake lane badge when detail loaded', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._detail).toBeTruthy(), { timeout: 2000 });
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.intake-lane-badge');
      expect(badge).toBeTruthy();
      expect(badge!.textContent?.trim()).toContain('FAST');
    });

    it('renders dimension score bars', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._detail).toBeTruthy(), { timeout: 2000 });
      await el.updateComplete;
      const rows = el.shadowRoot!.querySelectorAll('.dimension-row');
      expect(rows.length).toBe(2);
    });

    it('renders trust-score-panel in compact mode', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._detail).toBeTruthy(), { timeout: 2000 });
      await el.updateComplete;
      const panel = el.shadowRoot!.querySelector('agency-trust-score-panel');
      expect(panel).toBeTruthy();
      expect(panel!.getAttribute('mode')).toBe('compact');
    });
  });

  describe('data fetching', () => {
    it('fetches from correct endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(SAMPLE_DETAIL), { status: 200 })
      );
      globalThis.fetch = mockFetch as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const call = mockFetch.mock.calls.find((c: unknown[]) =>
        String(c[0]).includes('/contributors/'));
      expect(call).toBeTruthy();
      expect(call![0]).toBe('/api/governance/contributors/contributor-1');
    });

    it('sets error state on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('', { status: 500 })
      ) as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._error).toBeTruthy());
      await el.updateComplete;
      const error = el.shadowRoot!.querySelector('[role="alert"]');
      expect(error).toBeTruthy();
      expect(error!.textContent).toContain('500');
    });

    it('renders loading state', async () => {
      globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      const loading = el.shadowRoot!.querySelector('[role="status"]');
      expect(loading).toBeTruthy();
    });
  });

  describe('actor-id change', () => {
    it('resets state when actorId changes', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._detail).toBeTruthy(), { timeout: 2000 });
      el.actorId = 'contributor-2';
      await el.updateComplete;
      expect(el._detail).toBeNull();
    });

    it('cancels in-flight fetch on rapid actor change', async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      el.actorId = 'contributor-2';
      await el.updateComplete;
      expect(abortSpy).toHaveBeenCalled();
      abortSpy.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('announces data load', async () => {
      const announceSpy = vi.spyOn(el as any, 'announce');
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._detail).toBeTruthy(), { timeout: 2000 });
      expect(announceSpy).toHaveBeenCalledWith('Contributor data loaded for contributor-1');
    });

    it('announces fetch failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('', { status: 500 })
      ) as unknown as typeof fetch;
      const announceSpy = vi.spyOn(el as any, 'announce');
      document.body.appendChild(el);
      await el.updateComplete;
      await vi.waitFor(() => expect(el._error).toBeTruthy());
      expect(announceSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
    });
  });
});
