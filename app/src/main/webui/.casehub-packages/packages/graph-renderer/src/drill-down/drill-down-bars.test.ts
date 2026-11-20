import { describe, it, expect, afterEach } from 'vitest';
import { DrillDownBars } from './drill-down-bars.js';
import { DrillDownState } from './drill-down-state.js';
import type { GraphModel } from '@casehubio/graph-core';

const MODEL = { nodes: [], edges: [] } as unknown as GraphModel;
const VP = { x: 0, y: 0, zoom: 1 };

describe('DrillDownBars', () => {
  let container: HTMLDivElement;
  let bars: DrillDownBars;

  afterEach(() => {
    bars?.dispose();
    container?.remove();
  });

  function setup(levels: number = 0): DrillDownState {
    container = document.createElement('div');
    document.body.appendChild(container);
    bars = new DrillDownBars();
    const state = new DrillDownState();
    for (let i = 0; i < levels; i++) {
      state.push({ name: `Level ${i}`, model: MODEL }, `n${i}`, VP, [], [], i);
    }
    bars.render(container, state);
    return state;
  }

  it('renders no bars when stack is empty', () => {
    setup(0);
    expect(container.querySelectorAll('[role="button"]').length).toBe(0);
  });

  it('renders one bar per stack level', () => {
    setup(2);
    expect(container.querySelectorAll('[role="button"]').length).toBe(2);
  });

  it('bar has aria-label with level name', () => {
    setup(1);
    const bar = container.querySelector('[role="button"]') as HTMLElement;
    expect(bar.getAttribute('aria-label')).toBe('Navigate to Level 0');
  });

  it('bars wrapped in role=navigation', () => {
    setup(1);
    const nav = container.querySelector('[role="navigation"]');
    expect(nav).toBeTruthy();
    expect(nav!.getAttribute('aria-label')).toBe('Drill-down breadcrumb');
  });

  it('click bar dispatches drill-down-navigate event', () => {
    setup(2);
    const events: CustomEvent[] = [];
    container.addEventListener('drill-down-navigate', ((e: Event) => events.push(e as CustomEvent)));
    (container.querySelector('[role="button"]') as HTMLElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.depth).toBe(0);
  });

  it('bar is 32px wide', () => {
    setup(1);
    const bar = container.querySelector('[role="button"]') as HTMLElement;
    expect(bar.style.width).toBe('32px');
  });

  it('bar has rotated level name text', () => {
    setup(1);
    const bar = container.querySelector('[role="button"]') as HTMLElement;
    expect(bar.textContent).toBe('Level 0');
  });

  it('dispose removes all bars', () => {
    setup(2);
    bars.dispose();
    expect(container.querySelector('[role="navigation"]')).toBeNull();
  });

  it('re-render updates bars to match new state', () => {
    const state = setup(1);
    expect(container.querySelectorAll('[role="button"]').length).toBe(1);
    state.push({ name: 'Level 1', model: MODEL }, 'n1', VP, [], [], 1);
    bars.render(container, state);
    expect(container.querySelectorAll('[role="button"]').length).toBe(2);
  });
});
