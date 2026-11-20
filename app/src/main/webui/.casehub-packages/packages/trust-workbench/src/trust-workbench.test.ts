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

import './trust-workbench.js';
import type { RoutingDecisionSummary, RoutingDecisionDetail } from './types.js';
import type { RoutingRationaleData, CandidateScore } from '@casehubio/mosaic-routing-rationale';
import type { GateDecision } from '@casehubio/mosaic-trust-feedback-display';

type TrustWorkbenchEl = HTMLElement & {
  endpoint: string;
  actorId: string;
  routingHistory?: readonly RoutingDecisionSummary[];
  routingDetailResolver?: (id: string) => Promise<RoutingDecisionDetail>;
  routingColumns?: unknown;
  routingColumnRenderers?: unknown;
  renderCandidate?: unknown;
  _selectedCapability: string | null;
  _selectedDecisionId: string | null;
  _routingDetail: RoutingRationaleData | null;
  _feedbackEntries: readonly GateDecision[];
  _detailLoading: boolean;
  _detailError: string | null;
  updateComplete: Promise<boolean>;
};

const POLICY = {
  threshold: 0.7, borderlineMargin: 0.1, blendFactor: 0.6,
  minimumObservations: 10, qualityFloors: {}, cbrWeight: 0, bootstrapEscalationRequired: false,
} as const;

const SELECTED: CandidateScore = {
  workerId: 'agent-a', trustScore: 0.82, workloadScore: 0.8,
  phase: 'QUALIFIED', observations: 14, finalScore: 0.812,
};

const SAMPLE_RATIONALE: RoutingRationaleData = {
  capabilityTag: 'code-review', strategyId: 'trust-weighted',
  selected: SELECTED, alternatives: [], policy: POLICY,
};

const SAMPLE_FEEDBACK: GateDecision = {
  decision: 'APPROVED', actor: 'agent-a', attestation: 'ENDORSED',
  trustScoreBefore: 0.78, trustScoreAfter: 0.82, dimension: 'accuracy',
};

const SAMPLE_SUMMARIES: RoutingDecisionSummary[] = [
  { id: 'dec-1', timestamp: '2026-07-20T10:00:00Z', capabilityTag: 'code-review', selectedWorkerId: 'agent-a', finalScore: 0.812, phase: 'QUALIFIED' },
  { id: 'dec-2', timestamp: '2026-07-20T09:00:00Z', capabilityTag: 'triage', selectedWorkerId: 'agent-b', finalScore: 0.75, phase: 'QUALIFIED' },
];

const SAMPLE_DETAIL: RoutingDecisionDetail = {
  rationale: SAMPLE_RATIONALE,
  feedback: [SAMPLE_FEEDBACK],
};

let originalFetch: typeof globalThis.fetch;

function emitCapabilitySelected(tag: string): void {
  document.dispatchEvent(new CustomEvent('pages-event', {
    bubbles: true,
    detail: { topic: 'trust:capability-selected', payload: { tag, score: 0.82, actorId: 'worker-42' } },
  }));
}

function emitDecisionSelected(id: string): void {
  document.dispatchEvent(new CustomEvent('pages-event', {
    bubbles: true,
    detail: { topic: 'trust-routing:selected', payload: { text: (col: unknown) => String(col).includes('id') ? id : '' } },
  }));
}

describe('agency-trust-workbench', () => {
  let el: TrustWorkbenchEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ actorId: 'worker-42', globalScore: 0.85, capabilityScores: {}, dimensionScores: {} }), { status: 200 })
    ) as unknown as typeof fetch;
    el = document.createElement('agency-trust-workbench') as TrustWorkbenchEl;
    el.endpoint = '/api';
    el.actorId = 'worker-42';
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

    it('renders split-workbench with trust-routing selection-topic', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const sw = el.shadowRoot!.querySelector('pages-split-workbench');
      expect(sw).toBeTruthy();
      expect(sw!.getAttribute('selection-topic')).toBe('trust-routing');
    });

    it('renders trust-score-panel in left slot', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const panel = el.shadowRoot!.querySelector('agency-trust-score-panel');
      expect(panel).toBeTruthy();
    });

    it('renders list-pane in left slot with trust-routing topic', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const listPane = el.shadowRoot!.querySelector('agency-list-pane');
      expect(listPane).toBeTruthy();
      expect(listPane!.getAttribute('selection-topic')).toBe('trust-routing');
    });

    it('passes endpoint to trust-score-panel', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const panel = el.shadowRoot!.querySelector('agency-trust-score-panel') as any;
      expect(panel?.endpoint).toBe('/api');
    });

    it('passes actorId to trust-score-panel', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const panel = el.shadowRoot!.querySelector('agency-trust-score-panel') as any;
      expect(panel?.actorId).toBe('worker-42');
    });

    it('detail panel has left padding for divider clearance', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const detailPanel = el.shadowRoot!.querySelector('.detail-panel') as HTMLElement;
      expect(detailPanel).toBeTruthy();
      const styles = (el.constructor as any).styles.cssText ?? String((el.constructor as any).styles);
      expect(styles).toContain('padding-left');
    });

    it('renders empty detail pane when no decision selected', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      const rationale = el.shadowRoot!.querySelector('agency-routing-rationale');
      expect(rationale).toBeNull();
      expect(el.shadowRoot!.textContent).toContain('Select a routing decision');
    });

    it('renders routing-rationale when detail loaded', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._routingDetail = SAMPLE_RATIONALE;
      el._feedbackEntries = [SAMPLE_FEEDBACK];
      await el.updateComplete;
      const rationale = el.shadowRoot!.querySelector('agency-routing-rationale');
      expect(rationale).toBeTruthy();
    });

    it('renders trust-feedback-display for each feedback entry', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._routingDetail = SAMPLE_RATIONALE;
      el._feedbackEntries = [SAMPLE_FEEDBACK, { ...SAMPLE_FEEDBACK, decision: 'REJECTED' }];
      await el.updateComplete;
      const displays = el.shadowRoot!.querySelectorAll('agency-trust-feedback-display');
      expect(displays.length).toBe(2);
    });

    it('renders error state with role="alert"', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._detailError = 'HTTP 500';
      await el.updateComplete;
      const error = el.shadowRoot!.querySelector('[role="alert"]');
      expect(error).toBeTruthy();
      expect(error!.textContent).toContain('500');
    });

    it('renders loading state with role="status"', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._detailLoading = true;
      await el.updateComplete;
      const loading = el.shadowRoot!.querySelector('[role="status"]');
      expect(loading).toBeTruthy();
    });
  });

  describe('capability selection', () => {
    it('updates list-pane endpoint on capability selection', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      emitCapabilitySelected('code-review');
      await el.updateComplete;
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.endpoint).toContain('capability=code-review');
    });

    it('toggles capability off when same tag selected again', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      emitCapabilitySelected('code-review');
      await el.updateComplete;
      emitCapabilitySelected('code-review');
      await el.updateComplete;
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.endpoint).not.toContain('capability=');
    });

    it('resets decision selection on capability change', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._selectedDecisionId = 'dec-1';
      el._routingDetail = SAMPLE_RATIONALE;
      emitCapabilitySelected('triage');
      await el.updateComplete;
      expect(el._selectedDecisionId).toBeNull();
      expect(el._routingDetail).toBeNull();
    });
  });

  describe('decision selection and detail loading', () => {
    it('fetches detail on decision selection', async () => {
      const trustResponse = { actorId: 'worker-42', globalScore: 0.85, capabilityScores: {}, dimensionScores: {} };
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        const body = String(url).includes('/routing-history/') ? SAMPLE_DETAIL : trustResponse;
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      mockFetch.mockClear();
      emitDecisionSelected('dec-1');
      await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const detailCall = mockFetch.mock.calls.find((c: unknown[]) => String(c[0]).includes('/routing-history/'));
      expect(detailCall).toBeTruthy();
      expect(detailCall![0]).toContain('/api/trust/worker-42/routing-history/dec-1');
    });

    it('populates routingDetail and feedbackEntries after fetch', async () => {
      const trustResponse = { actorId: 'worker-42', globalScore: 0.85, capabilityScores: {}, dimensionScores: {} };
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        const body = String(url).includes('/routing-history/') ? SAMPLE_DETAIL : trustResponse;
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }) as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      emitDecisionSelected('dec-1');
      await vi.waitFor(() => expect(el._routingDetail).toBeTruthy(), { timeout: 2000 });
      expect(el._routingDetail!.selected.workerId).toBe('agent-a');
      expect(el._feedbackEntries.length).toBe(1);
    });

    it('cancels in-flight fetch on rapid selection change', async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      emitDecisionSelected('dec-1');
      emitDecisionSelected('dec-2');
      expect(abortSpy).toHaveBeenCalled();
      abortSpy.mockRestore();
    });

    it('sets detailError on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 500 })) as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      emitDecisionSelected('dec-1');
      await vi.waitFor(() => expect(el._detailError).toBeTruthy());
      expect(el._detailError).toContain('500');
    });
  });

  describe('actor-id change', () => {
    it('resets all state when actor-id changes', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._selectedCapability = 'code-review';
      el._selectedDecisionId = 'dec-1';
      el._routingDetail = SAMPLE_RATIONALE;
      el._feedbackEntries = [SAMPLE_FEEDBACK];
      el.actorId = 'worker-99';
      await el.updateComplete;
      expect(el._selectedCapability).toBeNull();
      expect(el._selectedDecisionId).toBeNull();
      expect(el._routingDetail).toBeNull();
      expect(el._feedbackEntries).toEqual([]);
    });
  });

  describe('inline data mode', () => {
    it('works when routingHistory is set before DOM connection', async () => {
      el.routingHistory = SAMPLE_SUMMARIES;
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise(r => setTimeout(r, 50));
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.dataSet).toBeTruthy();
      expect(listPane?.dataSet?.rows?.length).toBe(2);
    });

    it('renders list from routingHistory without fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ actorId: 'worker-42', globalScore: 0.85, capabilityScores: {}, dimensionScores: {} }), { status: 200 })
      );
      globalThis.fetch = mockFetch as unknown as typeof fetch;
      document.body.appendChild(el);
      await el.updateComplete;
      el.routingHistory = SAMPLE_SUMMARIES;
      await el.updateComplete;
      await new Promise(r => setTimeout(r, 50));
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.dataSet).toBeTruthy();
      expect(listPane?.dataSet?.rows?.length).toBe(2);
    });

    it('filters inline data by selected capability', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el.routingHistory = SAMPLE_SUMMARIES;
      await el.updateComplete;
      await new Promise(r => setTimeout(r, 50));
      emitCapabilitySelected('code-review');
      await el.updateComplete;
      await new Promise(r => setTimeout(r, 50));
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.dataSet?.rows?.length).toBe(1);
    });

    it('uses routingDetailResolver instead of fetch', async () => {
      const resolver = vi.fn().mockResolvedValue(SAMPLE_DETAIL);
      el.routingDetailResolver = resolver;
      document.body.appendChild(el);
      await el.updateComplete;
      emitDecisionSelected('dec-1');
      await vi.waitFor(() => expect(resolver).toHaveBeenCalledWith('dec-1'));
      await vi.waitFor(() => expect(el._routingDetail).toBeTruthy());
    });
  });

  describe('tier 2 customisation', () => {
    it('passes custom routingColumns to list-pane', async () => {
      const customConfig = [{ id: 'custom' as any, sortable: false }] as const;
      el.routingColumns = customConfig;
      document.body.appendChild(el);
      await el.updateComplete;
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.columnConfig).toBe(customConfig);
    });

    it('passes custom routingColumnRenderers to list-pane', async () => {
      const customRenderers = new Map() as ReadonlyMap<any, any>;
      el.routingColumnRenderers = customRenderers;
      document.body.appendChild(el);
      await el.updateComplete;
      const listPane = el.shadowRoot!.querySelector('agency-list-pane') as any;
      expect(listPane?.columnRenderers).toBe(customRenderers);
    });

    it('passes renderCandidate to routing-rationale', async () => {
      const renderFn = () => undefined;
      el.renderCandidate = renderFn;
      el._routingDetail = SAMPLE_RATIONALE;
      document.body.appendChild(el);
      await el.updateComplete;
      const rationale = el.shadowRoot!.querySelector('agency-routing-rationale') as any;
      expect(rationale?.renderCandidate).toBe(renderFn);
    });
  });

  describe('accessibility', () => {
    it('announces capability filter change', async () => {
      const announceSpy = vi.spyOn(el as any, 'announce');
      document.body.appendChild(el);
      await el.updateComplete;
      emitCapabilitySelected('code-review');
      expect(announceSpy).toHaveBeenCalledWith('Filtered to code-review');
    });

    it('announces deselection', async () => {
      document.body.appendChild(el);
      await el.updateComplete;
      el._selectedCapability = 'code-review';
      const announceSpy = vi.spyOn(el as any, 'announce');
      emitCapabilitySelected('code-review');
      expect(announceSpy).toHaveBeenCalledWith('Showing all routing decisions');
    });
  });
});
