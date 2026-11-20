import { describe, it, expect, vi, beforeEach } from 'vitest';
import './case-explorer.js';
import type { EntityTypeRegistration, EntityListResponse, EntityInstance, EntityTreeNode } from './types.js';
import { columnId } from '@casehubio/pages-data';

describe('CaseExplorer', () => {
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
    state: {},
    availableCommands: [],
    createdAt: '2026-01-01T00:00:00Z',
  };

  const testResponse: EntityListResponse = {
    entities: [testEntity],
    totalCount: 1,
  };

  const mockTree: EntityTreeNode[] = [
    {
      id: 'c1', type: 'case-instance', label: 'PR Review #42', status: 'RUNNING',
      children: [
        { id: 'w1', type: 'worker', label: 'lint', status: 'COMPLETED' },
        { id: 'w2', type: 'worker', label: 'test', status: 'RUNNING' },
      ],
    },
  ];

  const caseType: EntityTypeRegistration = {
    type: 'case-instance',
    label: 'Cases',
    listEndpoint: '/api/cases',
    detailEndpoint: (id) => `/api/cases/${id}`,
    columnConfig: [{ id: columnId('summary'), label: 'Name' }],
    treeEndpoint: (rootId) => `/api/cases/${rootId}/tree`,
  };

  const workerType: EntityTypeRegistration = {
    type: 'worker',
    label: 'Workers',
    listEndpoint: '/api/workers',
    detailEndpoint: (id) => `/api/workers/${id}`,
    columnConfig: [{ id: columnId('summary'), label: 'Name' }],
  };

  function createExplorer(types: readonly EntityTypeRegistration[] = [caseType, workerType]) {
    const el = document.createElement('agency-case-explorer') as any;
    el.entityTypes = types;
    el.fetchFn = fetchFn;
    document.body.appendChild(el);
    return el;
  }

  it('renders entity type tabs from entityTypes', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<Element>;
    expect(tabs.length).toBe(2);
    const labels: string[] = [];
    tabs.forEach(t => labels.push(t.textContent!.trim()));
    expect(labels).toContain('Cases');
    expect(labels).toContain('Workers');
  });

  it('first tab is selected by default', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<Element>;
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
  });

  it('renders entity-list for the selected entity type', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const entityList = el.shadowRoot!.querySelector('agency-entity-list');
    expect(entityList).toBeTruthy();
  });

  it('renders entity-detail panel', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const entityDetail = el.shadowRoot!.querySelector('agency-entity-detail');
    expect(entityDetail).toBeTruthy();
  });

  it('renders split-workbench for layout', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const workbench = el.shadowRoot!.querySelector('pages-split-workbench');
    expect(workbench).toBeTruthy();
  });

  it('renders view mode toggle', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('[role="radiogroup"]');
    expect(toggle).toBeTruthy();
  });

  it('switching tab changes the entity-list registration', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
    tabs[1]!.click();
    await el.updateComplete;

    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    const entityList = el.shadowRoot!.querySelector('agency-entity-list') as any;
    expect(entityList.registration.type).toBe('worker');
  });

  it('switching to tree mode with selected entity fetches tree data and renders entity-tree with nodes', async () => {
    fetchFn
      .mockResolvedValueOnce({ ok: true, json: async () => testResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => testEntity })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTree });

    const el = createExplorer();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    el._nav.selectEntity({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    el._nav.setViewMode('tree');
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    const callCount = fetchFn.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(2);
    const treeUrl = fetchFn.mock.calls[callCount - 1]![0] as string;
    expect(treeUrl).toContain('/tree');

    const lastCallUrl = fetchFn.mock.calls[callCount - 1]![0] as string;
    expect(lastCallUrl).toContain('/api/cases/c1/tree');
  });

  it('switching to tree mode without selection shows prompt', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => testResponse });
    const el = createExplorer();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    el._nav.setViewMode('tree');
    await el.updateComplete;

    const prompt = el.shadowRoot!.querySelector('.tree-prompt');
    expect(prompt).toBeTruthy();
  });

  it('selecting a tree node does NOT re-fetch the tree — detail updates, tree stays', async () => {
    fetchFn
      .mockResolvedValueOnce({ ok: true, json: async () => testResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => testEntity })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTree });

    const el = createExplorer();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    el._nav.selectEntity({ id: 'c1', type: 'case-instance' });
    await el.updateComplete;

    el._nav.setViewMode('tree');
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    const fetchCountAfterTree = fetchFn.mock.calls.length;
    const treeUrl = fetchFn.mock.calls[fetchCountAfterTree - 1]![0] as string;
    expect(treeUrl).toContain('/api/cases/c1/tree');

    fetchFn.mockResolvedValueOnce({ ok: true, json: async () => ({
      id: 'w1', type: 'worker', status: 'COMPLETED', summary: 'lint',
      state: { step: 'done' }, availableCommands: [], createdAt: '2026-01-01T00:00:00Z',
    })});

    document.dispatchEvent(new CustomEvent('pages-event', {
      detail: { topic: 'case-explorer:selected', payload: { id: 'w1', type: 'worker' } },
      bubbles: true, composed: true,
    }));
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    const fetchCountAfterNodeSelect = fetchFn.mock.calls.length;
    expect(fetchCountAfterNodeSelect).toBe(fetchCountAfterTree + 1);

    const detailFetchUrl = fetchFn.mock.calls[fetchCountAfterTree]![0] as string;
    expect(detailFetchUrl).not.toContain('/tree');

    const tree = el.shadowRoot!.querySelector('agency-entity-tree');
    expect(tree).toBeTruthy();

    const prompt = el.shadowRoot!.querySelector('.tree-prompt');
    expect(prompt).toBeNull();
  });
});
