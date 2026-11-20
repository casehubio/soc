import { describe, it, expect, vi } from 'vitest';
import { render } from 'lit';
import { renderFilterBar } from './filter-bar.js';

function renderToContainer(template: unknown): HTMLDivElement {
  const container = document.createElement('div');
  render(template, container);
  return container;
}

describe('renderFilterBar', () => {
  it('renders filter chips with role="checkbox"', () => {
    const categories = ['CASE', 'WORKER', 'TIMER'];
    const active = new Set(categories);
    const container = renderToContainer(renderFilterBar(categories, active, () => {}));
    const chips = container.querySelectorAll('[role="checkbox"]');
    expect(chips.length).toBe(3);
  });

  it('marks active filters as aria-checked="true"', () => {
    const active = new Set(['CASE']);
    const container = renderToContainer(renderFilterBar(['CASE', 'WORKER'], active, () => {}));
    const chips = container.querySelectorAll('[role="checkbox"]');
    expect(chips[0]?.getAttribute('aria-checked')).toBe('true');
    expect(chips[1]?.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onToggle with the category when clicked', () => {
    const onToggle = vi.fn();
    const container = renderToContainer(renderFilterBar(['CASE'], new Set(['CASE']), onToggle));
    const chip = container.querySelector('[role="checkbox"]') as HTMLElement;
    chip.click();
    expect(onToggle).toHaveBeenCalledWith('CASE');
  });

  it('renders within a group with aria-label="Filter"', () => {
    const container = renderToContainer(renderFilterBar(['A', 'B'], new Set(['A', 'B']), () => {}));
    const group = container.querySelector('[role="group"]');
    expect(group).toBeTruthy();
    expect(group?.getAttribute('aria-label')).toBe('Filter');
  });

  it('displays category text as chip content', () => {
    const container = renderToContainer(renderFilterBar(['Alpha', 'Beta'], new Set(['Alpha']), () => {}));
    const chips = container.querySelectorAll('.filter-chip');
    expect(chips[0]?.textContent?.trim()).toBe('Alpha');
    expect(chips[1]?.textContent?.trim()).toBe('Beta');
  });
});
