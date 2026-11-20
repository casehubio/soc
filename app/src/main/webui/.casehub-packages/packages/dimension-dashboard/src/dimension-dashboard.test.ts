import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './dimension-dashboard.js';
import type { DimensionDashboardData } from './types.js';

type DimensionDashboardEl = HTMLElement & {
  data: DimensionDashboardData | null;
  endpoint?: string;
  compact: boolean;
  updateComplete: Promise<boolean>;
};

const SAMPLE_DATA: DimensionDashboardData = {
  serviceId: 'order-api',
  serviceName: 'Order API',
  overallHealth: 'DEGRADED',
  dimensions: [
    { type: 'health', label: 'Health', status: 'RUNNING', severity: 'OK', activeResponses: 0 },
    { type: 'security', label: 'Security', status: 'CVE_DETECTED', severity: 'HIGH', activeResponses: 2 },
    { type: 'compliance', label: 'Compliance', status: 'PARTIAL', severity: 'MEDIUM', activeResponses: 1 },
    { type: 'performance', label: 'Performance', status: 'NORMAL', severity: 'LOW', activeResponses: 0 },
  ],
};

describe('agency-dimension-dashboard', () => {
  let el: DimensionDashboardEl;

  beforeEach(() => {
    el = document.createElement('agency-dimension-dashboard') as DimensionDashboardEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No dimension data');
  });

  it('renders service name and overall health', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Order API');
    expect(text).toContain('DEGRADED');
  });

  it('renders all dimension labels', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Health');
    expect(text).toContain('Security');
    expect(text).toContain('Compliance');
    expect(text).toContain('Performance');
  });

  it('renders severity badges', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const badges = el.shadowRoot!.querySelectorAll('.severity-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders active response counts', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('2');
  });

  it('emits dimension.selected on dimension click', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const dim = el.shadowRoot!.querySelector('.dimension-card') as HTMLElement;
    expect(dim).toBeTruthy();
    dim.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'dimension.selected'
    );
    expect(event).toBeTruthy();
    expect((event![0] as CustomEvent).detail.payload.type).toBe('health');
    document.removeEventListener('pages-event', handler);
  });

  it('applies compact layout when compact=true', async () => {
    el.data = SAMPLE_DATA;
    el.compact = true;
    await el.updateComplete;
    const container = el.shadowRoot!.querySelector('.dimensions');
    expect(container!.classList.contains('compact')).toBe(true);
  });

  it('renders normal layout when compact=false', async () => {
    el.data = SAMPLE_DATA;
    el.compact = false;
    await el.updateComplete;
    const container = el.shadowRoot!.querySelector('.dimensions');
    expect(container!.classList.contains('compact')).toBe(false);
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_DATA), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/service/order-api/status';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    globalThis.fetch = fetch;
  });

  it('renders with empty dimensions array', async () => {
    el.data = { ...SAMPLE_DATA, dimensions: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No dimensions');
  });
});
