import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './topology-viewer.js';
import type { TopologySnapshot } from './types.js';

type TopologyViewerEl = HTMLElement & {
  data: TopologySnapshot | null;
  endpoint?: string;
  sseEndpoint?: string;
  updateComplete: Promise<boolean>;
};

const SAMPLE_TOPOLOGY: TopologySnapshot = {
  services: [
    { id: 'order-api', name: 'Order API', status: 'RUNNING', replicas: 3, image: 'quay.io/app/orders:1.5.0', type: 'backend' },
    { id: 'payment-svc', name: 'Payment Service', status: 'DEGRADED', replicas: 2, image: 'quay.io/app/payments:2.1.0', type: 'backend' },
    { id: 'notification-svc', name: 'Notification Service', status: 'RUNNING', replicas: 1, type: 'worker' },
    { id: 'gateway', name: 'API Gateway', status: 'RUNNING', replicas: 2, type: 'gateway' },
  ],
  edges: [
    { source: 'gateway', target: 'order-api', label: 'HTTP' },
    { source: 'order-api', target: 'payment-svc', label: 'gRPC' },
    { source: 'order-api', target: 'notification-svc', label: 'async' },
  ],
};

describe('agency-topology-viewer', () => {
  let el: TopologyViewerEl;

  beforeEach(() => {
    el = document.createElement('agency-topology-viewer') as TopologyViewerEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No topology data');
  });

  it('converts TopologySnapshot to graph model', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain('No topology data');
  });

  it('renders service nodes', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Order API');
    expect(text).toContain('Payment Service');
    expect(text).toContain('Notification Service');
    expect(text).toContain('API Gateway');
  });

  it('renders node status badges', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('RUNNING');
    expect(text).toContain('DEGRADED');
  });

  it('renders edges', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const edges = el.shadowRoot!.querySelectorAll('.edge');
    expect(edges.length).toBe(3);
  });

  it('renders edge labels', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('HTTP');
    expect(text).toContain('gRPC');
  });

  it('emits topology.node-selected on node click', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const node = el.shadowRoot!.querySelector('.topology-node') as HTMLElement;
    expect(node).toBeTruthy();
    node.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'topology.node-selected'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('renders replica count when available', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('3');
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_TOPOLOGY), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/topology';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    globalThis.fetch = fetch;
  });

  it('renders with empty services array', async () => {
    el.data = { services: [], edges: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No services');
  });

  it('renders summary stats', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('4');
    expect(text).toContain('3');
  });
});
