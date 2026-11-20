import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './similarity-panel.js';
import type { Precedent } from './types.js';

type SimilarityPanelEl = HTMLElement & {
  endpoint?: string;
  data: Precedent[] | null;
  emptyMessage: string;
  loading: boolean;
  updateComplete: Promise<boolean>;
};

const SAMPLE_DATA: Precedent[] = [
  { caseId: 'prec-001', similarity: 92, outcome: 'Resolved', resolutionTime: '3 days' },
  { caseId: 'prec-002', similarity: 45, outcome: 'Escalated', resolutionTime: '5 days' },
  { caseId: 'prec-003', similarity: 78, outcome: 'Pending', resolutionTime: '2 days' },
];

let originalFetch: typeof globalThis.fetch;

describe('agency-similarity-panel', () => {
  let el: SimilarityPanelEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    el = document.createElement('agency-similarity-panel') as SimilarityPanelEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
  });

  it('renders empty message when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No similar cases found');
  });

  it('renders custom empty message', async () => {
    el.emptyMessage = 'Nothing to show';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Nothing to show');
  });

  it('renders pages-table when data is provided via property', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table');
    expect(table).toBeTruthy();
  });

  it('similarity renderer output is self-contained (inline styles for cross-shadow-DOM)', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    expect(table).toBeTruthy();
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const similarityCell = cellContents.find(h => h.includes('92%'));
    expect(similarityCell).toBeDefined();
    expect(similarityCell).toContain('style=');
    expect(similarityCell).not.toMatch(/class="[^"]*bar-fill/);
  });

  it('outcome renderer output is self-contained (inline styles for cross-shadow-DOM)', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    expect(table).toBeTruthy();
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const outcomeCell = cellContents.find(h => h.includes('Resolved'));
    expect(outcomeCell).toBeDefined();
    expect(outcomeCell).toContain('style=');
    expect(outcomeCell).not.toMatch(/class="[^"]*outcome-badge/);
  });

  it('suppresses fetch when data prop is set', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.data = SAMPLE_DATA;
    el.endpoint = 'http://test.local/api/precedents';
    await el.updateComplete;
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_DATA), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/precedents';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it('emits precedent.selected on row activation', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    expect(table).toBeTruthy();

    table.dispatchEvent(new CustomEvent('row-activate', {
      bubbles: true,
      composed: true,
      detail: {
        row: {
          text: (col: unknown) => {
            const id = String(col);
            if (id.includes('caseId')) return 'prec-001';
            if (id.includes('outcome')) return 'Resolved';
            return '';
          },
          number: (col: unknown) => {
            const id = String(col);
            if (id.includes('similarity')) return 92;
            return 0;
          },
        },
      },
    }));

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'precedent.selected'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('renders table with client-sort enabled', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as any;
    expect(table).toBeTruthy();
    expect(table.clientSort).toBe(true);
  });

  it('renders loading state during fetch', async () => {
    const mockFetch = vi.fn(() => new Promise(() => {}));
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/precedents';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.loading).toBe(true));
    expect(el.shadowRoot!.textContent).toContain('Loading');
  });

  it('renders error state on fetch failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/precedents';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('unavailable'));
  });

  it('has aria-label on host', () => {
    expect(el.getAttribute('aria-label')).toBe('Similar cases');
  });

  it('accepts custom aria-label', async () => {
    el.setAttribute('aria-label', 'Past precedents');
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('Past precedents');
  });
});
