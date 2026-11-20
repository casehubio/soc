import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './cluster-panel.js';
import type { ClusterInfo } from './types.js';

type ClusterPanelEl = HTMLElement & {
  data: ClusterInfo[] | null;
  endpoint?: string;
  readonly: boolean;
  updateComplete: Promise<boolean>;
};

const SAMPLE_CLUSTERS: ClusterInfo[] = [
  { id: 'c1', name: 'prod-eu', apiUrl: 'https://k8s-eu.example.com', namespace: 'default', type: 'KUBERNETES', status: 'CONNECTED', applicationCount: 5 },
  { id: 'c2', name: 'prod-us', apiUrl: 'https://k8s-us.example.com', namespace: 'apps', type: 'OPENSHIFT', status: 'UNREACHABLE', applicationCount: 3 },
];

describe('agency-cluster-panel', () => {
  let el: ClusterPanelEl;

  beforeEach(() => {
    el = document.createElement('agency-cluster-panel') as ClusterPanelEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No clusters');
  });

  it('renders cluster list when data provided', async () => {
    el.data = SAMPLE_CLUSTERS;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('prod-eu');
    expect(text).toContain('prod-us');
  });

  it('renders cluster status badges', async () => {
    el.data = SAMPLE_CLUSTERS;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('CONNECTED');
    expect(text).toContain('UNREACHABLE');
  });

  it('renders cluster type', async () => {
    el.data = SAMPLE_CLUSTERS;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('KUBERNETES');
    expect(text).toContain('OPENSHIFT');
  });

  it('renders application count', async () => {
    el.data = SAMPLE_CLUSTERS;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('5');
  });

  it('shows registration form when not readonly', async () => {
    el.data = SAMPLE_CLUSTERS;
    el.readonly = false;
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('.registration-form');
    expect(form).toBeTruthy();
  });

  it('hides registration form when readonly', async () => {
    el.data = SAMPLE_CLUSTERS;
    el.readonly = true;
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('.registration-form');
    expect(form).toBeNull();
  });

  it('hides delete buttons when readonly', async () => {
    el.data = SAMPLE_CLUSTERS;
    el.readonly = true;
    await el.updateComplete;
    const deleteBtn = el.shadowRoot!.querySelector('.delete-btn');
    expect(deleteBtn).toBeNull();
  });

  it('emits cluster.deleted on delete click', async () => {
    el.data = SAMPLE_CLUSTERS;
    el.readonly = false;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const deleteBtn = el.shadowRoot!.querySelector('.delete-btn') as HTMLElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'cluster.deleted'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('emits cluster.tested on test click', async () => {
    el.data = SAMPLE_CLUSTERS;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const testBtn = el.shadowRoot!.querySelector('.test-btn') as HTMLElement;
    expect(testBtn).toBeTruthy();
    testBtn.click();

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'cluster.tested'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('emits cluster.registered on form submit', async () => {
    el.data = [];
    el.readonly = false;
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    const nameInput = el.shadowRoot!.querySelector('input[name="name"]') as HTMLInputElement;
    const apiUrlInput = el.shadowRoot!.querySelector('input[name="apiUrl"]') as HTMLInputElement;
    const namespaceInput = el.shadowRoot!.querySelector('input[name="namespace"]') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    expect(apiUrlInput).toBeTruthy();

    nameInput.value = 'new-cluster';
    apiUrlInput.value = 'https://new.example.com';
    namespaceInput.value = 'default';

    const form = el.shadowRoot!.querySelector('.registration-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const event = handler.mock.calls.find(
      (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'cluster.registered'
    );
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('fetches from endpoint when no data prop', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_CLUSTERS), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    el.endpoint = 'http://test.local/api/clusters';
    await el.updateComplete;
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    globalThis.fetch = fetch;
  });
});
