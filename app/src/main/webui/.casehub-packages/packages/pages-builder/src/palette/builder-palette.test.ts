import { describe, it, expect, afterEach } from 'vitest';
import './builder-palette.js';
import type { PagesBuilderPalette } from './builder-palette.js';
import type { PaletteContext } from '../catalog/palette-context.js';
import type { ComponentCatalogEntry } from '../catalog/component-catalog.js';

function createPalette(ctx?: Partial<PaletteContext>): PagesBuilderPalette {
  const el = document.createElement('pages-builder-palette') as PagesBuilderPalette;
  el.context = {
    parentType: undefined,
    acceptsComponents: true,
    availableDatasets: ['ds1'],
    siblingTypes: [],
    ...ctx,
  };
  return el;
}

describe('PagesBuilderPalette', () => {
  let el: PagesBuilderPalette;

  afterEach(() => {
    el?.remove();
  });

  it('renders component tiles', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const tiles = el.shadowRoot!.querySelectorAll('.palette-tile');
    expect(tiles.length).toBeGreaterThan(40);
  });

  it('filters tiles by search text', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('.palette-search') as HTMLInputElement;
    input.value = 'bar';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    const tiles = el.shadowRoot!.querySelectorAll('.palette-tile');
    const labels = Array.from(tiles).map(t => t.querySelector('.tile-label')?.textContent);
    expect(labels).toContain('Bar Chart');
    expect(tiles.length).toBeLessThan(10);
  });

  it('filters by category', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.category-tab');
    const chartsTab = Array.from(tabs).find(t => t.textContent === 'Charts') as HTMLElement;
    chartsTab?.click();
    await el.updateComplete;

    const tiles = el.shadowRoot!.querySelectorAll('.palette-tile');
    const types = Array.from(tiles).map(t => t.querySelector('.tile-type')?.textContent);
    for (const type of types) {
      expect(['bar-chart', 'line-chart', 'area-chart', 'pie-chart',
        'scatter-chart', 'bubble-chart', 'timeseries',
        'heatmap-chart', 'treemap-chart', 'density-heatmap']).toContain(type);
    }
  });

  it('toggles category off on second click', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.category-tab');
    const chartsTab = Array.from(tabs).find(t => t.textContent === 'Charts') as HTMLElement;
    chartsTab?.click();
    await el.updateComplete;
    const countFiltered = el.shadowRoot!.querySelectorAll('.palette-tile').length;

    chartsTab?.click();
    await el.updateComplete;
    const countAll = el.shadowRoot!.querySelectorAll('.palette-tile').length;

    expect(countAll).toBeGreaterThan(countFiltered);
  });

  it('shows promoted tiles for form components inside form-scope', async () => {
    el = createPalette({ parentType: 'form-scope' });
    document.body.appendChild(el);
    await el.updateComplete;

    const promoted = el.shadowRoot!.querySelectorAll('.palette-tile.promoted');
    expect(promoted.length).toBeGreaterThan(0);

    const labels = Array.from(promoted).map(t => t.querySelector('.tile-label')?.textContent);
    expect(labels).toContain('Text Input');
  });

  it('shows prerequisite hint when no datasets', async () => {
    el = createPalette({ availableDatasets: [] });
    document.body.appendChild(el);
    await el.updateComplete;

    const hints = el.shadowRoot!.querySelectorAll('.tile-hint');
    expect(hints.length).toBeGreaterThan(0);

    const dashed = el.shadowRoot!.querySelectorAll('.palette-tile.needs-prereq');
    expect(dashed.length).toBeGreaterThan(0);
  });

  it('fires component-select on tile click', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent<ComponentCatalogEntry>[] = [];
    el.addEventListener('component-select', (e: Event) => { events.push(e as CustomEvent); });

    const tile = el.shadowRoot!.querySelector('.palette-tile') as HTMLElement;
    tile?.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.type).toBeTruthy();
    expect(events[0]!.detail.label).toBeTruthy();
  });

  it('sorts promoted tiles before normal tiles', async () => {
    el = createPalette({ parentType: 'form-scope' });
    document.body.appendChild(el);
    await el.updateComplete;

    const tiles = el.shadowRoot!.querySelectorAll('.palette-tile');
    const classes = Array.from(tiles).map(t => t.classList.contains('promoted'));
    const firstNonPromoted = classes.indexOf(false);
    const lastPromoted = classes.lastIndexOf(true);
    expect(lastPromoted).toBeLessThan(firstNonPromoted);
  });

  it('shows empty state when search has no matches', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('.palette-search') as HTMLInputElement;
    input.value = 'zzzznonexistent';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    const empty = el.shadowRoot!.querySelector('.palette-empty');
    expect(empty).toBeTruthy();
    expect(empty!.textContent).toContain('No components');
  });

  it('has All tab active by default', async () => {
    el = createPalette();
    document.body.appendChild(el);
    await el.updateComplete;

    const allTab = el.shadowRoot!.querySelector('.category-tab.active');
    expect(allTab?.textContent).toBe('All');
  });

  it('hides page-level components inside containers', async () => {
    el = createPalette({ parentType: 'tabs' });
    document.body.appendChild(el);
    await el.updateComplete;

    const types = Array.from(el.shadowRoot!.querySelectorAll('.tile-type')).map(t => t.textContent);
    expect(types).not.toContain('page');
    expect(types).not.toContain('lazy-page');
  });
});
