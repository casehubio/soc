import { describe, it, expect } from 'vitest';
import { render } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
import { renderVerticalTimeline, type VerticalTimelineOptions } from './vertical.js';

const makeNodes = (count: number, overrides?: Partial<EventTimelineNode>): EventTimelineNode[] =>
  Array.from({ length: count }, (_, i) => ({
    key: `node-${i}`,
    label: `Node ${i}`,
    status: 'completed' as const,
    timestamp: `2026-01-01T${String(10 + i).padStart(2, '0')}:00:00Z`,
    ...overrides,
  }));

function renderToContainer(template: unknown): HTMLDivElement {
  const container = document.createElement('div');
  render(template, container);
  return container;
}

describe('renderVerticalTimeline', () => {
  const defaultOpts: VerticalTimelineOptions = {
    expandedKeys: new Set(),
    onNodeClick: () => {},
    onToggleExpand: () => {},
    onKeyDown: () => {},
  };

  it('renders a list with role="list"', () => {
    const nodes = makeNodes(3);
    const container = renderToContainer(renderVerticalTimeline(nodes, defaultOpts));
    const list = container.querySelector('[role="list"]');
    expect(list).toBeTruthy();
    expect(list?.getAttribute('aria-label')).toBe('Timeline');
  });

  it('renders each node as role="listitem"', () => {
    const nodes = makeNodes(3);
    const container = renderToContainer(renderVerticalTimeline(nodes, defaultOpts));
    const items = container.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(3);
  });

  it('uses status-based CSS classes, not category classes', () => {
    const nodes = makeNodes(1, { status: 'active' });
    const container = renderToContainer(renderVerticalTimeline(nodes, defaultOpts));
    const node = container.querySelector('.timeline-node');
    expect(node?.classList.contains('status-active')).toBe(true);
    expect(node?.classList.contains('lifecycle')).toBe(false);
    expect(node?.classList.contains('CASE')).toBe(false);
  });

  it('shows expand button when node has detail', () => {
    const nodes = makeNodes(1, { detail: { foo: 'bar' } });
    const container = renderToContainer(renderVerticalTimeline(nodes, defaultOpts));
    expect(container.querySelector('.expand-button')).toBeTruthy();
  });

  it('shows detail content when key is in expandedKeys', () => {
    const nodes = makeNodes(1, { detail: { foo: 'bar' } });
    const opts = { ...defaultOpts, expandedKeys: new Set(['node-0']) };
    const container = renderToContainer(renderVerticalTimeline(nodes, opts));
    expect(container.querySelector('.payload-detail')).toBeTruthy();
  });

  it('calls renderNode callback when provided', () => {
    const nodes = makeNodes(1);
    let called = false;
    const opts = { ...defaultOpts, renderNode: () => { called = true; return 'custom'; } };
    renderToContainer(renderVerticalTimeline(nodes, opts));
    expect(called).toBe(true);
  });

  it('displays timestamp when present', () => {
    const nodes = makeNodes(1, { timestamp: '2026-01-01T10:30:00Z' });
    const container = renderToContainer(renderVerticalTimeline(nodes, defaultOpts));
    const ts = container.querySelector('.timestamp');
    expect(ts).toBeTruthy();
  });

  it('displays actor info when present', () => {
    const nodes = makeNodes(1, { actor: 'Alice' });
    const container = renderToContainer(renderVerticalTimeline(nodes, defaultOpts));
    const actor = container.querySelector('.worker-info');
    expect(actor).toBeTruthy();
    expect(actor?.textContent).toContain('Alice');
  });
});
