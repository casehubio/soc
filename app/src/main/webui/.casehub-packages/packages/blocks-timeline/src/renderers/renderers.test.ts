import { describe, it, expect, vi } from 'vitest';
import { html, render, nothing } from 'lit';
import type { TimelineNode } from '../types.js';
import { renderVertical, type VerticalOptions } from './vertical.js';
import { renderHorizontal, type HorizontalOptions } from './horizontal.js';
import { renderCompact, computeTemporalWeights, type CompactOptions } from './compact.js';

const makeNodes = (count: number, overrides?: Partial<TimelineNode>): TimelineNode[] =>
  Array.from({ length: count }, (_, i) => ({
    key: `node-${i}`,
    label: `Node ${i}`,
    status: 'completed' as const,
    timestamp: `2026-01-01T${String(10 + i).padStart(2, '0')}:00:00Z`,
    category: 'lifecycle',
    ...overrides,
  }));

function renderToContainer(template: unknown): HTMLDivElement {
  const container = document.createElement('div');
  render(template, container);
  return container;
}

describe('renderVertical', () => {
  const defaultOpts: VerticalOptions = {
    expandedKeys: new Set(),
    onNodeClick: () => {},
    onToggleExpand: () => {},
    onKeyDown: () => {},
  };

  it('renders role="list" container', () => {
    const c = renderToContainer(renderVertical(makeNodes(3), defaultOpts));
    expect(c.querySelector('[role="list"]')).toBeTruthy();
  });

  it('does not set aria-orientation on vertical list', () => {
    const c = renderToContainer(renderVertical(makeNodes(3), defaultOpts));
    expect(c.querySelector('[role="list"]')?.getAttribute('aria-orientation')).toBeNull();
  });

  it('renders one listitem per node', () => {
    const c = renderToContainer(renderVertical(makeNodes(3), defaultOpts));
    expect(c.querySelectorAll('[role="listitem"]').length).toBe(3);
  });

  it('renders category CSS class on nodes', () => {
    const c = renderToContainer(renderVertical(makeNodes(1, { category: 'task' }), defaultOpts));
    expect(c.querySelector('.timeline-node.task')).toBeTruthy();
  });

  it('renders category CSS class for all categories', () => {
    const categories = ['lifecycle', 'task', 'agent', 'milestone', 'action-gate', 'orchestration', 'timer'];
    categories.forEach(cat => {
      const c = renderToContainer(renderVertical(makeNodes(1, { category: cat }), defaultOpts));
      expect(c.querySelector(`.timeline-node.${cat}`)).toBeTruthy();
    });
  });

  it('renders aria-label with node label', () => {
    const c = renderToContainer(renderVertical(makeNodes(1, { label: 'CASE STARTED' }), defaultOpts));
    const item = c.querySelector('[role="listitem"]');
    expect(item?.getAttribute('aria-label')).toContain('CASE STARTED');
  });

  it('calls renderNode callback when provided', () => {
    const renderNode = vi.fn(() => html`<span class="custom">custom</span>`);
    const c = renderToContainer(renderVertical(makeNodes(1), { ...defaultOpts, renderNode }));
    expect(renderNode).toHaveBeenCalledOnce();
    expect(c.querySelector('.custom')).toBeTruthy();
  });

  it('renders default node content when no renderNode', () => {
    const c = renderToContainer(renderVertical(makeNodes(1), defaultOpts));
    expect(c.querySelector('.node-dot')).toBeTruthy();
    expect(c.querySelector('.event-type-badge')).toBeTruthy();
  });

  it('renders expand button with aria-expanded', () => {
    const c = renderToContainer(renderVertical(makeNodes(1, { detail: { x: 1 } }), defaultOpts));
    const btn = c.querySelector('.expand-button');
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders detail when node is expanded', () => {
    const opts: VerticalOptions = { ...defaultOpts, expandedKeys: new Set(['node-0']) };
    const c = renderToContainer(renderVertical(makeNodes(1, { detail: { x: 1 } }), opts));
    expect(c.querySelector('.expand-button')?.getAttribute('aria-expanded')).toBe('true');
    expect(c.querySelector('.payload-detail')).toBeTruthy();
  });

  it('calls renderDetail callback for expanded content', () => {
    const renderDetail = vi.fn(() => html`<span class="custom-detail">det</span>`);
    const opts: VerticalOptions = { ...defaultOpts, expandedKeys: new Set(['node-0']), renderDetail };
    const c = renderToContainer(renderVertical(makeNodes(1, { detail: { x: 1 } }), opts));
    expect(renderDetail).toHaveBeenCalledOnce();
    expect(c.querySelector('.custom-detail')).toBeTruthy();
  });

  it('shows actor info when present', () => {
    const c = renderToContainer(renderVertical(makeNodes(1, { actor: 'Alice' }), defaultOpts));
    expect(c.textContent).toContain('Alice');
  });

  it('calls onNodeClick with node and index', () => {
    const onNodeClick = vi.fn();
    const opts: VerticalOptions = { ...defaultOpts, onNodeClick };
    const c = renderToContainer(renderVertical(makeNodes(1), opts));
    const body = c.querySelector('.node-body') as HTMLElement;
    body.click();
    expect(onNodeClick).toHaveBeenCalledWith(expect.objectContaining({ key: 'node-0' }), 0);
  });

  it('renders empty timeline when no nodes', () => {
    const c = renderToContainer(renderVertical([], defaultOpts));
    expect(c.querySelectorAll('[role="listitem"]').length).toBe(0);
  });
});

describe('renderHorizontal', () => {
  const defaultOpts: HorizontalOptions = {
    onNodeClick: () => {},
    onKeyDown: () => {},
  };

  it('renders role="list" with aria-orientation="horizontal"', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(3), defaultOpts));
    const list = c.querySelector('[role="list"]');
    expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('renders aria-label on list', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(3), defaultOpts));
    expect(c.querySelector('[role="list"]')?.getAttribute('aria-label')).toBeTruthy();
  });

  it('renders one listitem per node', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(3), defaultOpts));
    expect(c.querySelectorAll('[role="listitem"]').length).toBe(3);
  });

  it('renders connectors between nodes', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(3), defaultOpts));
    expect(c.querySelectorAll('.connector').length).toBe(2);
  });

  it('no connector before first node', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(1), defaultOpts));
    expect(c.querySelectorAll('.connector').length).toBe(0);
  });

  it('styles connectors based on adjacent status', () => {
    const nodes: TimelineNode[] = [
      { key: 'a', label: 'A', status: 'completed' },
      { key: 'b', label: 'B', status: 'active' },
      { key: 'c', label: 'C', status: 'pending' },
    ];
    const c = renderToContainer(renderHorizontal(nodes, defaultOpts));
    const connectors = c.querySelectorAll('.connector');
    expect(connectors[0]!.classList.contains('connector--completed')).toBe(true);
    expect(connectors[1]!.classList.contains('connector--completed')).toBe(false);
  });

  it('renders numbered circles by default', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(3), defaultOpts));
    const circles = c.querySelectorAll('.stage-node');
    expect(circles[0]!.textContent?.trim()).toBe('1');
    expect(circles[2]!.textContent?.trim()).toBe('3');
  });

  it('renders status CSS class on stage nodes', () => {
    const nodes: TimelineNode[] = [
      { key: 'a', label: 'A', status: 'completed' },
      { key: 'b', label: 'B', status: 'active' },
      { key: 'c', label: 'C', status: 'pending' },
      { key: 'd', label: 'D', status: 'failed' },
      { key: 'e', label: 'E', status: 'skipped' },
    ];
    const c = renderToContainer(renderHorizontal(nodes, defaultOpts));
    expect(c.querySelector('.stage-node--completed')).toBeTruthy();
    expect(c.querySelector('.stage-node--active')).toBeTruthy();
    expect(c.querySelector('.stage-node--pending')).toBeTruthy();
    expect(c.querySelector('.stage-node--failed')).toBeTruthy();
    expect(c.querySelector('.stage-node--skipped')).toBeTruthy();
  });

  it('renders label below node', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(1, { label: 'Open' }), defaultOpts));
    expect(c.querySelector('.stage-label')?.textContent).toBe('Open');
  });

  it('renders actor when present', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(1, { actor: 'agent-1' }), defaultOpts));
    expect(c.querySelector('.stage-actor')?.textContent).toBe('agent-1');
  });

  it('renders timestamp when present', () => {
    const c = renderToContainer(renderHorizontal(makeNodes(1), defaultOpts));
    expect(c.querySelector('.stage-time')).toBeTruthy();
  });

  it('calls renderNode callback when provided', () => {
    const renderNode = vi.fn(() => html`<span class="custom-h">ch</span>`);
    const c = renderToContainer(renderHorizontal(makeNodes(1), { ...defaultOpts, renderNode }));
    expect(renderNode).toHaveBeenCalledOnce();
    expect(c.querySelector('.custom-h')).toBeTruthy();
  });

  it('calls onNodeClick with node and index', () => {
    const onNodeClick = vi.fn();
    const c = renderToContainer(renderHorizontal(makeNodes(1), { ...defaultOpts, onNodeClick }));
    const stage = c.querySelector('.stage') as HTMLElement;
    stage.click();
    expect(onNodeClick).toHaveBeenCalledWith(expect.objectContaining({ key: 'node-0' }), 0);
  });

  it('renders empty pipeline when no nodes', () => {
    const c = renderToContainer(renderHorizontal([], defaultOpts));
    expect(c.querySelectorAll('[role="listitem"]').length).toBe(0);
  });
});

describe('renderCompact', () => {
  const defaultOpts: CompactOptions = {
    onExpandRequested: () => {},
    onKeyDown: () => {},
  };

  it('renders role="img" container', () => {
    const c = renderToContainer(renderCompact(makeNodes(3), defaultOpts));
    expect(c.querySelector('[role="img"]')).toBeTruthy();
  });

  it('renders aria-label with node count', () => {
    const c = renderToContainer(renderCompact(makeNodes(5), defaultOpts));
    const strip = c.querySelector('[role="img"]');
    expect(strip?.getAttribute('aria-label')).toContain('5');
  });

  it('renders dots for each node', () => {
    const c = renderToContainer(renderCompact(makeNodes(3), defaultOpts));
    expect(c.querySelectorAll('.event-dot').length).toBe(3);
  });

  it('truncates to first 3 + last 2 when > 7 nodes', () => {
    const c = renderToContainer(renderCompact(makeNodes(10), defaultOpts));
    const dots = c.querySelectorAll('.event-dot');
    expect(dots.length).toBe(5);
    const ellipsis = c.querySelector('.ellipsis');
    expect(ellipsis).toBeTruthy();
    expect(ellipsis?.textContent).toContain('+5');
  });

  it('truncates 8 nodes to first 3 + last 2 + "+3"', () => {
    const c = renderToContainer(renderCompact(makeNodes(8), defaultOpts));
    expect(c.querySelectorAll('.event-dot').length).toBe(5);
    expect(c.querySelector('.ellipsis')?.textContent).toContain('+3');
  });

  it('does not truncate when <= 7 nodes', () => {
    const c = renderToContainer(renderCompact(makeNodes(7), defaultOpts));
    expect(c.querySelectorAll('.event-dot').length).toBe(7);
    expect(c.querySelector('.ellipsis')).toBeNull();
  });

  it('does not truncate exactly 7 nodes', () => {
    const c = renderToContainer(renderCompact(makeNodes(7), defaultOpts));
    expect(c.querySelectorAll('.event-dot').length).toBe(7);
  });

  it('calls onExpandRequested on click', () => {
    const onExpandRequested = vi.fn();
    const c = renderToContainer(renderCompact(makeNodes(3), { ...defaultOpts, onExpandRequested }));
    const strip = c.querySelector('.compact-strip') as HTMLElement;
    strip.click();
    expect(onExpandRequested).toHaveBeenCalledOnce();
  });

  it('renders data-tooltip on each event', () => {
    const c = renderToContainer(renderCompact(makeNodes(2), defaultOpts));
    const events = c.querySelectorAll('.compact-event');
    events.forEach(e => expect(e.getAttribute('data-tooltip')).toBeTruthy());
  });

  it('renders category class on dots', () => {
    const c = renderToContainer(renderCompact(makeNodes(1, { category: 'milestone' }), defaultOpts));
    expect(c.querySelector('.event-dot.milestone')).toBeTruthy();
  });

  it('renders empty strip when no nodes', () => {
    const c = renderToContainer(renderCompact([], defaultOpts));
    expect(c.querySelectorAll('.event-dot').length).toBe(0);
  });
});

describe('computeTemporalWeights', () => {
  it('returns even weights for nodes without timestamps', () => {
    const nodes = makeNodes(3).map(n => ({ ...n, timestamp: undefined }));
    const weights = computeTemporalWeights(nodes);
    expect(weights).toEqual([0, 1, 1]);
  });

  it('returns proportional weights based on time gaps', () => {
    const nodes: TimelineNode[] = [
      { key: 'a', label: 'A', status: 'completed', timestamp: '2026-01-01T10:00:00Z' },
      { key: 'b', label: 'B', status: 'completed', timestamp: '2026-01-01T11:00:00Z' },
      { key: 'c', label: 'C', status: 'completed', timestamp: '2026-01-01T13:00:00Z' },
    ];
    const weights = computeTemporalWeights(nodes);
    expect(weights[0]).toBe(0);
    expect(weights[2]!).toBeGreaterThan(weights[1]!);
  });

  it('returns [1] for single node', () => {
    expect(computeTemporalWeights(makeNodes(1))).toEqual([1]);
  });

  it('returns even weights when all timestamps identical', () => {
    const nodes = makeNodes(3).map(n => ({ ...n, timestamp: '2026-01-01T10:00:00Z' }));
    const weights = computeTemporalWeights(nodes);
    expect(weights).toEqual([0, 1, 1]);
  });

  it('returns empty array for empty input', () => {
    expect(computeTemporalWeights([])).toEqual([]);
  });
});
