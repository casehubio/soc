import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './routing-rationale.js';
import type { RoutingRationaleData, CandidateScore, RoutingPolicySummary } from './types.js';

type RoutingRationaleEl = HTMLElement & {
  endpoint?: string;
  data: RoutingRationaleData | null;
  scoreLabel: string;
  capabilityLabel?: string;
  loading: boolean;
  updateComplete: Promise<boolean>;
};

const POLICY: RoutingPolicySummary = {
  threshold: 0.7, borderlineMargin: 0.1, blendFactor: 0.6,
  minimumObservations: 10, qualityFloors: {}, cbrWeight: 0, bootstrapEscalationRequired: false,
};

const SELECTED: CandidateScore = {
  workerId: 'agent-a', trustScore: 0.82, workloadScore: 0.8,
  phase: 'QUALIFIED', observations: 14, finalScore: 0.812,
};

const ALTERNATIVES: CandidateScore[] = [
  { workerId: 'agent-b', trustScore: 0.61, workloadScore: 0.9,
    phase: 'EXCLUDED_PHASE2B', observations: 12, finalScore: 0, exclusionReason: 'below threshold' },
  { workerId: 'agent-c', trustScore: null, workloadScore: 1.0,
    phase: 'BOOTSTRAP', observations: 3, finalScore: 1.0 },
];

const SAMPLE_DATA: RoutingRationaleData = {
  capabilityTag: 'code-review', strategyId: 'trust-weighted',
  selected: SELECTED, alternatives: ALTERNATIVES, policy: POLICY,
};

let originalFetch: typeof globalThis.fetch;

describe('agency-routing-rationale', () => {
  let el: RoutingRationaleEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    el = document.createElement('agency-routing-rationale') as RoutingRationaleEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No routing data');
  });

  it('renders pages-table when data is provided', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    expect(table).toBeTruthy();
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const rows = table.shadowRoot!.querySelectorAll('.row[role="row"]:not(.header)');
    expect(rows.length).toBe(3);
  });

  it('status column shows Selected for winner and exclusion reasons for others', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellTexts = Array.from(cells).map(c => c.textContent!.trim());
    expect(cellTexts).toContain('Selected');
    expect(cellTexts).toContain('below threshold');
    expect(cellTexts).toContain('Eligible');
  });

  it('emits routing.candidate-selected on row activation', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    table.dispatchEvent(new CustomEvent('row-activate', {
      bubbles: true, composed: true,
      detail: {
        row: {
          text: (col: unknown) => { const id = String(col); return id.includes('workerId') ? 'agent-a' : id.includes('phase') ? 'QUALIFIED' : ''; },
          number: (col: unknown) => String(col).includes('finalScore') ? 0.812 : 0,
          cell: (col: unknown) => String(col).includes('trustScore') ? { type: 'NUMBER' as const, value: 0.82 } : { type: 'NULL' as const },
        },
      },
    }));
    const event = handler.mock.calls.find((c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'routing.candidate-selected');
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('trust column renderer uses inline styles with threshold marker', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const trustCell = cellContents.find(h => h.includes('82%'));
    expect(trustCell).toBeDefined();
    expect(trustCell).toContain('style=');
  });

  it('phase badge renders with correct inline colours per phase', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const qualifiedBadge = cellContents.find(h => h.includes('QUALIFIED'));
    expect(qualifiedBadge).toContain('--pages-success-3');
    const excludedBadge = cellContents.find(h => h.includes('EXCLUDED'));
    expect(excludedBadge).toContain('--pages-danger-3');
    const bootstrapBadge = cellContents.find(h => h.includes('BOOTSTRAP'));
    expect(bootstrapBadge).toContain('--pages-neutral-3');
  });

  it('null trustScore renders dash instead of zero-width bar', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const bootstrapTrustCells = cellContents.filter(h => h.includes('—'));
    expect(bootstrapTrustCells.length).toBeGreaterThan(0);
  });

  it('displays capability tag as component title', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('code-review');
  });

  it('capabilityLabel overrides capabilityTag in title', async () => {
    el.capabilityLabel = 'Code Review';
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Code Review');
  });

  it('score header shows selected candidate trust score and phase', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const header = el.shadowRoot!.querySelector('[data-section="score-header"]');
    expect(header).toBeTruthy();
    expect(header!.textContent).toContain('82%');
    expect(header!.textContent).toContain('agent-a');
    expect(header!.textContent).toContain('QUALIFIED');
  });

  it('bootstrap selected candidate shows no-trust-data message', async () => {
    const bootstrapData: RoutingRationaleData = {
      ...SAMPLE_DATA,
      selected: { workerId: 'agent-c', trustScore: null, workloadScore: 1.0, phase: 'BOOTSTRAP', observations: 3, finalScore: 1.0 },
      alternatives: [SELECTED],
    };
    el.data = bootstrapData;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No trust data');
  });

  it('policy summary shows threshold, margin, blend, and min observations', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const summary = el.shadowRoot!.querySelector('[data-section="policy-summary"]');
    expect(summary).toBeTruthy();
    expect(summary!.textContent).toContain('0.70');
    expect(summary!.textContent).toContain('0.10');
    expect(summary!.textContent).toContain('60%');
    expect(summary!.textContent).toContain('10');
    expect(summary!.textContent).toContain('trust-weighted');
  });

  it('shows quality floors when present', async () => {
    const dataWithFloors: RoutingRationaleData = {
      ...SAMPLE_DATA,
      policy: { ...POLICY, qualityFloors: { accuracy: 0.8, completeness: 0.7 } },
    };
    el.data = dataWithFloors;
    await el.updateComplete;
    const summary = el.shadowRoot!.querySelector('[data-section="policy-summary"]');
    expect(summary!.textContent).toContain('accuracy');
    expect(summary!.textContent).toContain('0.80');
  });

  it('shows additional scores in score header when present', async () => {
    const dataWithExtra: RoutingRationaleData = {
      ...SAMPLE_DATA,
      selected: { ...SELECTED, additionalScores: { semanticScore: 0.78 } },
    };
    el.data = dataWithExtra;
    await el.updateComplete;
    const header = el.shadowRoot!.querySelector('[data-section="score-header"]');
    expect(header!.textContent).toContain('Semantic');
    expect(header!.textContent).toContain('0.78');
  });

  it('renders table with client-sort enabled', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as any;
    expect(table).toBeTruthy();
    expect(table.clientSort).toBe(true);
  });

  it('builds column renderers when data arrives via endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_DATA), { status: 200 })
    ) as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/routing';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.loading).toBe(false));
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as any;
    expect(table).toBeTruthy();
    expect(table.columnRenderers).toBeDefined();
    expect(table.columnRenderers!.size).toBeGreaterThan(0);
  });

  it('suppresses fetch when data prop is set', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.data = SAMPLE_DATA;
    el.endpoint = 'http://test.local/api/routing';
    await el.updateComplete;
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_DATA), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/routing';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it('shows loading state during fetch', async () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/routing';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.loading).toBe(true));
    expect(el.shadowRoot!.textContent).toContain('Loading');
  });

  it('shows error state on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 500 })) as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/routing';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('unavailable'));
  });

  it('scoreLabel appears on trust score bar label', async () => {
    el.scoreLabel = 'Capability Score';
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Capability Score');
  });

  it('score bars have role="img" with descriptive aria-label', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const imgs = el.shadowRoot!.querySelectorAll('[role="img"]');
    expect(imgs.length).toBeGreaterThan(0);
    const labels = Array.from(imgs).map(i => i.getAttribute('aria-label'));
    expect(labels.some(l => l?.includes('82%'))).toBe(true);
    expect(labels.some(l => l?.includes('threshold'))).toBe(true);
  });
});
