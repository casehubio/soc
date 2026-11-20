import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './compliance-summary.js';
import type { RequirementDefinition } from './types.js';

type ComplianceSummaryEl = HTMLElement & {
  endpoint?: string;
  requirements: RequirementDefinition[] | null;
  loading: boolean;
  updateComplete: Promise<boolean>;
};

const SAMPLE_REQUIREMENTS: RequirementDefinition[] = [
  { regulation: 'GDPR Art.5', requirement: 'Data minimisation', mechanism: 'Auto-purge', status: 'MET', evidenceUrl: 'http://evidence.local/1' },
  { regulation: 'GDPR Art.17', requirement: 'Right to erasure', mechanism: 'Erasure API', status: 'PARTIAL' },
  { regulation: 'ICH E6', requirement: 'Audit trail', mechanism: 'Merkle chain', status: 'GAP' },
  { regulation: 'FDA 21 CFR 11', requirement: 'Electronic signatures', mechanism: 'PKI signing', status: 'BREACHED' },
];

let originalFetch: typeof globalThis.fetch;

describe('agency-compliance-summary', () => {
  let el: ComplianceSummaryEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    el = document.createElement('agency-compliance-summary') as ComplianceSummaryEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
  });

  it('renders empty state when no requirements', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No regulatory requirements');
  });

  it('renders pages-table when requirements provided', async () => {
    el.requirements = SAMPLE_REQUIREMENTS;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table');
    expect(table).toBeTruthy();
  });

  it('status renderer output is self-contained (inline styles for cross-shadow-DOM)', async () => {
    el.requirements = SAMPLE_REQUIREMENTS;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    expect(table).toBeTruthy();
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const statusCell = cellContents.find(h => h.includes('>MET<'));
    expect(statusCell).toBeDefined();
    expect(statusCell).toContain('style=');
    expect(statusCell).not.toMatch(/class="[^"]*status-badge/);
  });

  it('evidence renderer output is self-contained (inline styles for cross-shadow-DOM)', async () => {
    el.requirements = SAMPLE_REQUIREMENTS;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    expect(table).toBeTruthy();
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const cells = table.shadowRoot!.querySelectorAll('[role="gridcell"]');
    const cellContents = Array.from(cells).map(c => c.innerHTML);
    const evidenceCell = cellContents.find(h => h.includes('View'));
    expect(evidenceCell).toBeDefined();
    expect(evidenceCell).toContain('style=');
    expect(evidenceCell).not.toMatch(/class="[^"]*evidence-link/);
  });

  it('suppresses fetch when requirements prop is set', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.requirements = SAMPLE_REQUIREMENTS;
    el.endpoint = 'http://test.local/api/compliance';
    await el.updateComplete;
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from endpoint when no requirements prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_REQUIREMENTS), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/compliance';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it('emits compliance.requirement-selected on row activation', async () => {
    el.requirements = SAMPLE_REQUIREMENTS;
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
            if (id.includes('regulation')) return 'GDPR Art.5';
            if (id.includes('requirement')) return 'Data minimisation';
            if (id.includes('status')) return 'MET';
            return '';
          },
          number: () => 0,
        },
      },
    }));

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'compliance.requirement-selected'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('renders table with client-sort enabled', async () => {
    el.requirements = SAMPLE_REQUIREMENTS;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table') as any;
    expect(table).toBeTruthy();
    expect(table.clientSort).toBe(true);
  });

  it('renders loading state during fetch', async () => {
    const mockFetch = vi.fn(() => new Promise(() => {}));
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/compliance';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.loading).toBe(true));
    expect(el.shadowRoot!.textContent).toContain('Loading');
  });

  it('renders error state on fetch failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/compliance';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('unavailable'));
  });

  it('has aria-label on host', () => {
    expect(el.getAttribute('aria-label')).toBe('Compliance status');
  });

  it('has role="region" on host', () => {
    expect(el.getAttribute('role')).toBe('region');
  });
});
