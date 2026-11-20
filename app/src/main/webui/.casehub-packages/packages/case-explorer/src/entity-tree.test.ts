import { describe, it, expect, vi, beforeEach } from 'vitest';
import './entity-tree.js';
import type { EntityTreeNode } from './types.js';

describe('EntityTree', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = vi.fn();
    document.body.innerHTML = '';
  });

  const leafNode: EntityTreeNode = {
    id: 'w1',
    type: 'worker',
    label: 'security-review',
    status: 'RUNNING',
  };

  const branchNode: EntityTreeNode = {
    id: 'c1',
    type: 'case-instance',
    label: 'PR Review #42',
    status: 'RUNNING',
    children: [
      { id: 'w1', type: 'worker', label: 'lint', status: 'COMPLETED' },
      { id: 'w2', type: 'worker', label: 'test', status: 'RUNNING' },
    ],
  };

  const groupNode: EntityTreeNode = {
    id: 'g1',
    type: 'sub-case-group',
    label: 'per-repo-checks',
    status: 'RUNNING',
    groupInfo: { groupId: 'g1', totalInGroup: 5, requiredCount: 3, completedCount: 1 },
    children: [
      { id: 'sc1', type: 'case-instance', label: 'repo-A', status: 'COMPLETED' },
    ],
  };

  const lazyNode: EntityTreeNode = {
    id: 'sc2',
    type: 'case-instance',
    label: 'repo-B',
    status: 'RUNNING',
    childrenEndpoint: '/api/cases/sc2/children',
    childCount: 3,
  };

  function createTree(nodes: readonly EntityTreeNode[]) {
    const el = document.createElement('agency-entity-tree') as any;
    el.nodes = nodes;
    el.selectionTopic = 'case';
    el.fetchFn = fetchFn;
    document.body.appendChild(el);
    return el;
  }

  it('renders tree nodes with label and status badge', async () => {
    const el = createTree([leafNode]);
    await el.updateComplete;

    const item = el.shadowRoot!.querySelector('[role="treeitem"]');
    expect(item).toBeTruthy();
    expect(item!.textContent).toContain('security-review');
    expect(item!.textContent).toContain('RUNNING');
  });

  it('renders container with role="tree"', async () => {
    const el = createTree([leafNode]);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('[role="tree"]');
    expect(tree).toBeTruthy();
  });

  it('renders expand/collapse for nodes with children', async () => {
    const el = createTree([branchNode]);
    await el.updateComplete;

    const expandable = el.shadowRoot!.querySelector('[aria-expanded]');
    expect(expandable).toBeTruthy();
  });

  it('toggling expand shows/hides children', async () => {
    const el = createTree([branchNode]);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.toggle') as HTMLElement;
    expect(toggle).toBeTruthy();

    toggle.click();
    await el.updateComplete;

    const childItems = el.shadowRoot!.querySelectorAll('[role="treeitem"]');
    expect(childItems.length).toBeGreaterThan(1);
  });

  it('renders M-of-N progress for group nodes', async () => {
    const el = createTree([groupNode]);
    await el.updateComplete;

    const item = el.shadowRoot!.querySelector('[role="treeitem"]');
    expect(item!.textContent).toContain('1/3');
    expect(item!.textContent).toContain('of 5');
  });

  it('emits EntitySelection on node click', async () => {
    const el = createTree([leafNode]);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    document.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail?.topic === 'case:selected') events.push(e);
    }) as EventListener);

    const item = el.shadowRoot!.querySelector('[role="treeitem"]') as HTMLElement;
    item.click();
    await new Promise(r => setTimeout(r, 0));

    expect(events.length).toBe(1);
    expect(events[0]!.detail.payload.id).toBe('w1');
    expect(events[0]!.detail.payload.type).toBe('worker');
  });

  it('shows expand affordance for lazy nodes with childCount', async () => {
    const el = createTree([lazyNode]);
    await el.updateComplete;

    const expandable = el.shadowRoot!.querySelector('[aria-expanded]');
    expect(expandable).toBeTruthy();
  });

  it('fetches children on expand for lazy nodes', async () => {
    const lazyChildren: EntityTreeNode[] = [
      { id: 'lw1', type: 'worker', label: 'lint', status: 'COMPLETED' },
      { id: 'lw2', type: 'worker', label: 'test', status: 'RUNNING' },
    ];
    fetchFn.mockResolvedValue({ ok: true, json: async () => lazyChildren });

    const el = createTree([lazyNode]);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.toggle') as HTMLElement;
    toggle.click();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('/api/cases/sc2/children');
  });

  it('custom nodeRenderer overrides default rendering', async () => {
    const el = createTree([leafNode]);
    el.nodeRenderer = (node: EntityTreeNode) => {
      const span = document.createElement('span');
      span.className = 'custom-node';
      span.textContent = `CUSTOM: ${node.label}`;
      return span;
    };
    await el.updateComplete;

    const custom = el.shadowRoot!.querySelector('.custom-node');
    expect(custom).toBeTruthy();
    expect(custom!.textContent).toBe('CUSTOM: security-review');
  });
});
