import { describe, it, expect, vi, beforeEach } from 'vitest';
import { html } from 'lit';
import './entity-detail.js';
import type { EntityTypeRegistration, EntityInstance } from './types.js';
import { columnId } from '@casehubio/pages-data';

describe('EntityDetail', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = vi.fn();
    document.body.innerHTML = '';
  });

  const testEntity: EntityInstance = {
    id: 'c1',
    type: 'case-instance',
    status: 'RUNNING',
    summary: 'PR Review #42',
    state: { branch: 'feature/login', commits: 3 },
    availableCommands: [
      { name: 'cancel', label: 'Cancel', endpoint: '/api/cases/c1/cancel', severity: 'destructive', confirmation: true },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  };

  const workerEntity: EntityInstance = {
    ...testEntity,
    id: 'w1',
    type: 'worker:flow',
    summary: 'Build pipeline',
    state: { currentStep: 'compile', progress: 60 },
  };

  const testRegistration: EntityTypeRegistration = {
    type: 'case-instance',
    label: 'Cases',
    listEndpoint: '/api/cases',
    detailEndpoint: (id) => `/api/cases/${id}`,
    columnConfig: [{ id: columnId('summary'), label: 'Name' }],
    relationships: [
      { childType: 'worker', label: 'Workers', endpointTemplate: '/api/cases/{parentId}/workers' },
    ],
  };

  const workerRegistration: EntityTypeRegistration = {
    type: 'worker',
    label: 'Workers',
    listEndpoint: '/api/workers',
    detailEndpoint: (id) => `/api/workers/${id}`,
    columnConfig: [{ id: columnId('summary'), label: 'Name' }],
    detailRendererMap: {
      'worker:flow': (entity) => html`<div class="flow-detail">Flow: ${entity.state['currentStep']}</div>`,
    },
  };

  function createDetail(reg: EntityTypeRegistration = testRegistration) {
    const el = document.createElement('agency-entity-detail') as any;
    el.registration = reg;
    el.fetchFn = fetchFn;
    el.selectionTopic = 'case';
    document.body.appendChild(el);
    return el;
  }

  it('shows empty state when no entity selected', async () => {
    const el = createDetail();
    await el.updateComplete;

    const empty = el.shadowRoot!.querySelector('.empty');
    expect(empty).toBeTruthy();
  });

  it('fetches EntityInstance from detailEndpoint on EntitySelection', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testEntity });
    const el = createDetail();
    await el.updateComplete;

    el.handleSelection({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));

    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('/api/cases/c1');
  });

  it('renders default state table when no custom renderer', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testEntity });
    const el = createDetail();
    await el.updateComplete;

    el.handleSelection({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const stateTable = el.shadowRoot!.querySelector('.state-table');
    expect(stateTable).toBeTruthy();
    expect(stateTable!.textContent).toContain('branch');
    expect(stateTable!.textContent).toContain('feature/login');
  });

  it('renders sub-type-specific detail renderer from detailRendererMap', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => workerEntity });
    const el = createDetail(workerRegistration);
    await el.updateComplete;

    el.handleSelection({ id: 'w1', type: 'worker:flow' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const flowDetail = el.shadowRoot!.querySelector('.flow-detail');
    expect(flowDetail).toBeTruthy();
    expect(flowDetail!.textContent).toContain('Flow: compile');
  });

  it('passes availableCommands to entity-command-bar', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testEntity });
    const el = createDetail();
    await el.updateComplete;

    el.handleSelection({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const commandBar = el.shadowRoot!.querySelector('agency-entity-command-bar');
    expect(commandBar).toBeTruthy();
    expect((commandBar as any).commands.length).toBe(1);
    expect((commandBar as any).commands[0].name).toBe('cancel');
  });

  it('renders relationship tabs', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testEntity });
    const el = createDetail();
    await el.updateComplete;

    el.handleSelection({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<Element>;
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    const tabLabels: string[] = [];
    tabs.forEach(t => tabLabels.push(t.textContent!.trim()));
    expect(tabLabels).toContain('Overview');
    expect(tabLabels).toContain('Workers');
  });

  it('shows loading state during fetch', async () => {
    let resolve: (v: any) => void;
    fetchFn.mockReturnValue(new Promise(r => { resolve = r; }));

    const el = createDetail();
    await el.updateComplete;

    el.handleSelection({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;

    expect(el._loading).toBe(true);
    resolve!({ ok: true, json: async () => testEntity });
  });

  it('shows error state on fetch failure', async () => {
    fetchFn.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    const el = createDetail();
    await el.updateComplete;

    el.handleSelection({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    expect(el._error).toBeTruthy();
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).toBeTruthy();
  });
});
