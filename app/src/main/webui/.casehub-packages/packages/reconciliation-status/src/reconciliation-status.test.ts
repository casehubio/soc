import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './reconciliation-status.js';
import type { ReconciliationSnapshot } from './types.js';

type ReconciliationStatusEl = HTMLElement & {
  data: ReconciliationSnapshot | null;
  endpoint?: string;
  sseEndpoint?: string;
  updateComplete: Promise<boolean>;
};

const SAMPLE_SNAPSHOT: ReconciliationSnapshot = {
  lastReconciled: '2026-08-14T12:00:00Z',
  clusters: [
    {
      clusterId: 'c1',
      clusterName: 'prod-eu',
      nodeCount: 5,
      convergedCount: 3,
      driftedCount: 1,
      faultedCount: 1,
      nodes: [
        { nodeId: 'n1', nodeType: 'Deployment', desired: 'image:v2', actual: 'image:v2', status: 'CONVERGED' },
        { nodeId: 'n2', nodeType: 'Service', desired: 'port:8080', actual: 'port:8080', status: 'CONVERGED' },
        { nodeId: 'n3', nodeType: 'ConfigMap', desired: 'key:new', actual: 'key:old', status: 'DRIFTED' },
        { nodeId: 'n4', nodeType: 'Deployment', desired: 'replicas:3', actual: 'error', status: 'FAULTED' },
        { nodeId: 'n5', nodeType: 'Secret', desired: 'token:xyz', actual: 'token:xyz', status: 'CONVERGED' },
      ],
    },
    {
      clusterId: 'c2',
      clusterName: 'prod-us',
      nodeCount: 2,
      convergedCount: 2,
      driftedCount: 0,
      faultedCount: 0,
      nodes: [
        { nodeId: 'n6', nodeType: 'Deployment', desired: 'image:v2', actual: 'image:v2', status: 'CONVERGED' },
        { nodeId: 'n7', nodeType: 'Service', desired: 'port:8080', actual: 'port:8080', status: 'CONVERGED' },
      ],
    },
  ],
};

describe('agency-reconciliation-status', () => {
  let el: ReconciliationStatusEl;

  beforeEach(() => {
    el = document.createElement('agency-reconciliation-status') as ReconciliationStatusEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No reconciliation data');
  });

  it('renders cluster names', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('prod-eu');
    expect(text).toContain('prod-us');
  });

  it('renders per-cluster summary counts', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('3');
    expect(text).toContain('1');
  });

  it('renders node status indicators', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('CONVERGED');
    expect(text).toContain('DRIFTED');
    expect(text).toContain('FAULTED');
  });

  it('renders desired vs actual for nodes', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('image:v2');
    expect(text).toContain('key:old');
  });

  it('renders last reconciled timestamp', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('2026-08-14');
  });

  it('emits reconciliation.node-selected on node click', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const nodeRow = el.shadowRoot!.querySelector('.node-row') as HTMLElement;
    expect(nodeRow).toBeTruthy();
    nodeRow.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'reconciliation.node-selected'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('emits reconciliation.trigger-requested on trigger button click', async () => {
    el.data = SAMPLE_SNAPSHOT;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const triggerBtn = el.shadowRoot!.querySelector('.trigger-btn') as HTMLElement;
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'reconciliation.trigger-requested'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_SNAPSHOT), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/reconciliation/status';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    globalThis.fetch = fetch;
  });

  it('renders with empty clusters array', async () => {
    el.data = { clusters: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No clusters');
  });
});
