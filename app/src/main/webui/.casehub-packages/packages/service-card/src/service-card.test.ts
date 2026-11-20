import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './service-card.js';
import type { ServiceCardData } from './types.js';

type ServiceCardEl = HTMLElement & {
  data: ServiceCardData | null;
  endpoint?: string;
  updateComplete: Promise<boolean>;
};

const SAMPLE_DATA: ServiceCardData = {
  serviceName: 'order-api',
  serviceId: 'order-api',
  image: 'quay.io/app/orders:1.5.0',
  replicas: 3,
  status: 'RUNNING',
  clusters: [
    { clusterId: 'c1', clusterName: 'prod-eu', status: 'converged', readyReplicas: 3, desiredReplicas: 3 },
    { clusterId: 'c2', clusterName: 'prod-us', status: 'provisioning', readyReplicas: 1, desiredReplicas: 3 },
  ],
};

describe('agency-service-card', () => {
  let el: ServiceCardEl;

  beforeEach(() => {
    el = document.createElement('agency-service-card') as ServiceCardEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No service data');
  });

  it('renders service name and status when data provided', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('order-api');
    expect(text).toContain('RUNNING');
  });

  it('renders image reference', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('quay.io/app/orders:1.5.0');
  });

  it('renders replica count', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('3');
  });

  it('renders per-cluster status entries', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('prod-eu');
    expect(text).toContain('prod-us');
  });

  it('renders cluster readyReplicas/desiredReplicas', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('1/3');
  });

  it('emits service-card.selected on card click', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const card = el.shadowRoot!.querySelector('.card') as HTMLElement;
    expect(card).toBeTruthy();
    card.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'service-card.selected'
    );
    expect(event).toBeTruthy();
    expect((event![0] as CustomEvent).detail.payload.serviceId).toBe('order-api');
    document.removeEventListener('pages-event', handler);
  });

  it('renders degraded status with appropriate styling', async () => {
    el.data = { ...SAMPLE_DATA, status: 'DEGRADED' };
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain('DEGRADED');
  });

  it('renders with empty clusters array', async () => {
    el.data = { ...SAMPLE_DATA, clusters: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('order-api');
    expect(el.shadowRoot!.textContent).toContain('No cluster data');
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_DATA), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/service/order-api';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    globalThis.fetch = fetch;
  });
});
