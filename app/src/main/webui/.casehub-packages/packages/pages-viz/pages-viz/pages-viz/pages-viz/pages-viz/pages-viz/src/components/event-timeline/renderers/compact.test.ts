import { describe, it, expect, vi } from 'vitest';
import { render } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
import { renderCompactTimeline, type CompactTimelineOptions } from './compact.js';

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

describe('renderCompactTimeline', () => {
  const defaultOpts: CompactTimelineOptions = {
    onExpandRequested: () => {},
    onKeyDown: () => {},
  };

  it('renders with role="img" and summary aria-label', () => {
    const nodes = makeNodes(3);
    const container = renderToContainer(renderCompactTimeline(nodes, defaultOpts));
    const strip = container.querySelector('[role="img"]');
    expect(strip).toBeTruthy();
    expect(strip?.getAttribute('aria-label')).toContain('3 events');
  });

  it('renders all dots when count is below threshold', () => {
    const nodes = makeNodes(5);
    const container = renderToContainer(renderCompactTimeline(nodes, defaultOpts));
    const dots = container.querySelectorAll('.event-dot');
    expect(dots.length).toBe(5);
    expect(container.querySelector('.ellipsis')).toBeFalsy();
  });

  it('truncates at 7+ nodes showing first 3 + last 2 with ellipsis', () => {
    const nodes = makeNodes(10);
    const container = renderToContainer(renderCompactTimeline(nodes, defaultOpts));
    const dots = container.querySelectorAll('.event-dot');
    expect(dots.length).toBe(5);
    const ellipsis = container.querySelector('.ellipsis');
    expect(ellipsis?.textContent).toContain('+5');
  });

  it('uses status-based CSS classes on dots', () => {
    const nodes = makeNodes(1, { status: 'failed' });
    const container = renderToContainer(renderCompactTimeline(nodes, defaultOpts));
    const dot = container.querySelector('.event-dot');
    expect(dot?.classList.contains('status-failed')).toBe(true);
    expect(dot?.classList.contains('lifecycle')).toBe(false);
  });

  it('calls onExpandRequested when strip is clicked', () => {
    const onExpandRequested = vi.fn();
    const nodes = makeNodes(3);
    const container = renderToContainer(renderCompactTimeline(nodes, { ...defaultOpts, onExpandRequested }));
    const strip = container.querySelector('.compact-strip') as HTMLElement;
    strip.click();
    expect(onExpandRequested).toHaveBeenCalled();
  });

  it('handles empty nodes array', () => {
    const container = renderToContainer(renderCompactTimeline([], defaultOpts));
    const strip = container.querySelector('[role="img"]');
    expect(strip).toBeTruthy();
    expect(strip?.getAttribute('aria-label')).toContain('0 events');
  });
});
