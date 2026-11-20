import { describe, it, expect, vi } from 'vitest';
import { render } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
import { renderHorizontalTimeline, type HorizontalTimelineOptions } from './horizontal.js';

const makeNodes = (count: number, overrides?: Partial<EventTimelineNode>): EventTimelineNode[] =>
  Array.from({ length: count }, (_, i) => ({
    key: `stage-${i}`,
    label: `Stage ${i}`,
    status: 'completed' as const,
    ...overrides,
  }));

function renderToContainer(template: unknown): HTMLDivElement {
  const container = document.createElement('div');
  render(template, container);
  return container;
}

describe('renderHorizontalTimeline', () => {
  const defaultOpts: HorizontalTimelineOptions = {
    onNodeClick: () => {},
    onKeyDown: () => {},
  };

  it('renders a list with aria-orientation="horizontal"', () => {
    const nodes = makeNodes(3);
    const container = renderToContainer(renderHorizontalTimeline(nodes, defaultOpts));
    const list = container.querySelector('[role="list"]');
    expect(list).toBeTruthy();
    expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('renders each node as role="listitem"', () => {
    const nodes = makeNodes(3);
    const container = renderToContainer(renderHorizontalTimeline(nodes, defaultOpts));
    const items = container.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(3);
  });

  it('renders connectors between nodes', () => {
    const nodes = makeNodes(3);
    const container = renderToContainer(renderHorizontalTimeline(nodes, defaultOpts));
    const connectors = container.querySelectorAll('.connector');
    expect(connectors.length).toBe(2);
  });

  it('uses status-based CSS classes on stage nodes', () => {
    const nodes = makeNodes(1, { status: 'active' });
    const container = renderToContainer(renderHorizontalTimeline(nodes, defaultOpts));
    const stageNode = container.querySelector('.stage-node');
    expect(stageNode?.classList.contains('stage-node--active')).toBe(true);
  });

  it('marks completed connectors', () => {
    const nodes: EventTimelineNode[] = [
      { key: 's0', label: 'A', status: 'completed' },
      { key: 's1', label: 'B', status: 'active' },
      { key: 's2', label: 'C', status: 'pending' },
    ];
    const container = renderToContainer(renderHorizontalTimeline(nodes, defaultOpts));
    const connectors = container.querySelectorAll('.connector');
    expect(connectors[0]?.classList.contains('connector--completed')).toBe(true);
    expect(connectors[1]?.classList.contains('connector--completed')).toBe(false);
  });

  it('calls onNodeClick when a stage is clicked', () => {
    const onNodeClick = vi.fn();
    const nodes = makeNodes(2);
    const container = renderToContainer(renderHorizontalTimeline(nodes, { ...defaultOpts, onNodeClick }));
    const stages = container.querySelectorAll('.stage');
    (stages[1] as HTMLElement).click();
    expect(onNodeClick).toHaveBeenCalledWith(nodes[1], 1);
  });

  it('shows actor and timestamp when present', () => {
    const nodes = makeNodes(1, { actor: 'Bob', timestamp: '2026-01-01T10:00:00Z' });
    const container = renderToContainer(renderHorizontalTimeline(nodes, defaultOpts));
    expect(container.querySelector('.stage-actor')?.textContent).toContain('Bob');
    expect(container.querySelector('.stage-time')).toBeTruthy();
  });
});
