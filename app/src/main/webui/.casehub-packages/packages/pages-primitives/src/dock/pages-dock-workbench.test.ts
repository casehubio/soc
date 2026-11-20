import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import './pages-dock-workbench.js';
import type { PagesDockWorkbench } from './pages-dock-workbench.js';
import type { DockItem } from '@casehubio/pages-component';

function createDock(props?: Partial<PagesDockWorkbench>): PagesDockWorkbench {
  const el = document.createElement('pages-dock-workbench') as PagesDockWorkbench;
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      (el as any)[key] = value;
    }
  }
  return el;
}

const leftItems: DockItem[] = [
  { icon: '📁', label: 'Explorer', panelId: 'explorer', defaultOpen: true },
  { icon: '🔍', label: 'Search', panelId: 'search' },
];

const rightItems: DockItem[] = [
  { icon: '⚙', label: 'Props', panelId: 'properties', zone: 'top', defaultOpen: true },
  { icon: '🧩', label: 'Comps', panelId: 'components', zone: 'bottom' },
];

describe('PagesDockWorkbench', () => {
  let el: PagesDockWorkbench;

  afterEach(() => {
    el?.remove();
  });

  it('uses light DOM (no shadow root)', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('.dock-layout')).toBeTruthy();
  });

  it('renders left dock bar with buttons', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    const bar = el.querySelector('.dock-bar-left');
    expect(bar).toBeTruthy();
    const buttons = bar!.querySelectorAll<HTMLButtonElement>('button[data-dock-panel-id]');
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.dataset.dockPanelId).toBe('explorer');
    expect(buttons[1]!.dataset.dockPanelId).toBe('search');
  });

  it('renders right dock bar with buttons', async () => {
    el = createDock({ rightPanels: rightItems });
    document.body.appendChild(el);
    await el.updateComplete;

    const bar = el.querySelector('.dock-bar-right');
    expect(bar).toBeTruthy();
    const buttons = bar!.querySelectorAll('button[data-dock-panel-id]');
    expect(buttons.length).toBe(2);
  });

  it('renders centre zone container', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector('.dock-zone-centre')).toBeTruthy();
  });

  it('omits zones with no panels', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector('.dock-bar-right')).toBeNull();
    expect(el.querySelector('.dock-zone-right')).toBeNull();
    expect(el.querySelector('.dock-bar-bottom')).toBeNull();
    expect(el.querySelector('.dock-zone-bottom')).toBeNull();
  });

  it('renders resize handles between zones', async () => {
    el = createDock({ leftPanels: leftItems, rightPanels: rightItems });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector('.resize-handle.resize-left')).toBeTruthy();
    expect(el.querySelector('.resize-handle.resize-right')).toBeTruthy();
  });

  it('zone sizes use percentage units and default to equal', async () => {
    el = createDock({ leftPanels: leftItems, rightPanels: rightItems });
    document.body.appendChild(el);
    await el.updateComplete;

    const leftZone = el.querySelector('.dock-zone-left') as HTMLElement;
    const rightZone = el.querySelector('.dock-zone-right') as HTMLElement;
    const leftStyle = leftZone.getAttribute('style') ?? '';
    const rightStyle = rightZone.getAttribute('style') ?? '';
    expect(leftStyle).toContain('%');
    expect(rightStyle).toContain('%');

    const leftMatch = leftStyle.match(/width:\s*([\d.]+)%/);
    const rightMatch = rightStyle.match(/width:\s*([\d.]+)%/);
    expect(leftMatch).toBeTruthy();
    expect(rightMatch).toBeTruthy();
    expect(leftMatch![1]).toBe(rightMatch![1]);
  });

  it('creates panel containers with data-component-id and data-deferred', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    const panels = el.querySelectorAll('[data-component-id]');
    expect(panels.length).toBe(2);
    expect(panels[0]!.getAttribute('data-component-id')).toBe('explorer');
    expect(panels[1]!.hasAttribute('data-deferred')).toBe(true);
  });

  it('injects CSS style element', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    const style = document.querySelector('style[data-pages-dock]') ?? el.querySelector('style[data-pages-dock]');
    expect(style).toBeTruthy();
  });

  it('has ARIA roles', async () => {
    el = createDock({ leftPanels: leftItems, rightPanels: rightItems });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector('[role="toolbar"]')).toBeTruthy();
    expect(el.querySelector('[role="separator"]')).toBeTruthy();
    expect(el.querySelector('[role="region"]')).toBeTruthy();
    expect(el.querySelector('[role="main"]')).toBeTruthy();
  });

  it('calls renderCentre on firstUpdated', async () => {
    const renderCentre = vi.fn();
    el = createDock({ leftPanels: leftItems, renderCentre });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(renderCentre).toHaveBeenCalledTimes(1);
    const container = renderCentre.mock.calls[0]![0] as HTMLElement;
    expect(container.classList.contains('dock-zone-centre')).toBe(true);
  });
});

describe('Toggle handling', () => {
  let el: PagesDockWorkbench;

  afterEach(() => {
    el?.remove();
  });

  it('showPanel makes panel visible and sets button active', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;
    el.showPanel('explorer');
    await el.updateComplete;
    const panel = el.querySelector('[data-component-id="explorer"]') as HTMLElement;
    expect(panel.style.display).not.toBe('none');
    const btn = el.querySelector('button[data-dock-panel-id="explorer"]') as HTMLElement;
    expect(btn.dataset.active).toBeDefined();
    expect(el.dockState['explorer']).toBe(true);
  });

  it('hidePanel hides panel and removes button active', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;
    el.showPanel('explorer');
    await el.updateComplete;
    el.hidePanel('explorer');
    await el.updateComplete;
    const panel = el.querySelector('[data-component-id="explorer"]') as HTMLElement;
    expect(panel.style.display).toBe('none');
    const btn = el.querySelector('button[data-dock-panel-id="explorer"]') as HTMLElement;
    expect(btn.dataset.active).toBeUndefined();
    expect(el.dockState['explorer']).toBe(false);
  });

  it('togglePanel toggles visibility', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.dockState['explorer']).toBe(true);
    el.togglePanel('explorer');
    expect(el.dockState['explorer']).toBe(false);
    el.togglePanel('explorer');
    expect(el.dockState['explorer']).toBe(true);
  });

  it('exclusive zone: showing B hides A in same zone', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;
    el.showPanel('explorer');
    await el.updateComplete;
    el.showPanel('search');
    await el.updateComplete;
    expect(el.dockState['explorer']).toBe(false);
    expect(el.dockState['search']).toBe(true);
    const explorerPanel = el.querySelector('[data-component-id="explorer"]') as HTMLElement;
    expect(explorerPanel.style.display).toBe('none');
  });

  it('different zones allow simultaneous panels', async () => {
    el = createDock({ rightPanels: rightItems });
    document.body.appendChild(el);
    await el.updateComplete;
    el.showPanel('properties');
    await el.updateComplete;
    el.showPanel('components');
    await el.updateComplete;
    expect(el.dockState['properties']).toBe(true);
    expect(el.dockState['components']).toBe(true);
  });

  it('calls renderContent on first open only', async () => {
    const renderContent = vi.fn();
    el = createDock({ leftPanels: leftItems, renderContent });
    document.body.appendChild(el);
    await el.updateComplete;
    el.showPanel('explorer');
    expect(renderContent).toHaveBeenCalledTimes(1);
    expect(renderContent).toHaveBeenCalledWith(expect.any(HTMLElement), 'explorer');
    el.hidePanel('explorer');
    el.showPanel('explorer');
    expect(renderContent).toHaveBeenCalledTimes(1);
  });

  it('dispatches pages-dock-toggle event', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;
    const events: CustomEvent[] = [];
    el.addEventListener('pages-dock-toggle', ((e: Event) => events.push(e as CustomEvent)) as EventListener);
    el.showPanel('explorer');
    expect(events).toHaveLength(1);
    expect(events[0]!.detail).toEqual({ panelId: 'explorer', visible: true });
    expect(events[0]!.bubbles).toBe(true);
    expect(events[0]!.composed).toBe(true);
  });
});

describe('State initialization and persistence', () => {
  let el: PagesDockWorkbench;
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: () => null,
  };

  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });
    }
  });

  afterEach(() => {
    el?.remove();
    localStorage.clear();
  });

  it('activates defaultOpen panels on firstUpdated', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.dockState['explorer']).toBe(true);
    expect(el.dockState['search']).toBe(false);
  });

  it('persisted state overrides defaultOpen', async () => {
    localStorage.setItem('test-persist', JSON.stringify({
      docks: { explorer: false, search: true },
    }));
    el = createDock({ leftPanels: leftItems, persistKey: 'test-persist' });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.dockState['search']).toBe(true);
    expect(el.dockState['explorer']).toBe(false);
  });

  it('saves state to localStorage on toggle', async () => {
    el = createDock({ leftPanels: leftItems, persistKey: 'test-save' });
    document.body.appendChild(el);
    await el.updateComplete;
    el.togglePanel('search');
    await new Promise(r => setTimeout(r, 350));
    const saved = JSON.parse(localStorage.getItem('test-save')!);
    expect(saved.docks['search']).toBe(true);
  });

  it('uses LayoutStore when provided', async () => {
    const store = {
      load: vi.fn().mockResolvedValue({ docks: { explorer: true }, splits: {}, panels: {} }),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    el = createDock({ leftPanels: leftItems, layoutStore: store, persistKey: 'store-key' });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(store.load).toHaveBeenCalledWith('store-key');
    expect(el.dockState['explorer']).toBe(true);
  });
});

describe('Side zone split (zones: 2)', () => {
  let el: PagesDockWorkbench;

  const twoZoneLeft: DockItem[] = [
    { icon: 'N', label: 'Nav', panelId: 'nav', zone: 'top', defaultOpen: true },
    { icon: 'B', label: 'Marks', panelId: 'marks', zone: 'bottom' },
  ];

  afterEach(() => {
    el?.remove();
  });

  it('both zone halves active — vertical split with separator', async () => {
    el = createDock({ leftPanels: twoZoneLeft });
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('marks');
    await el.updateComplete;

    const leftZone = el.querySelector('.dock-zone-left') as HTMLElement;
    const separator = leftZone?.querySelector('[data-zone-separator]');
    expect(separator).toBeTruthy();

    const navPanel = el.querySelector('[data-component-id="nav"]') as HTMLElement;
    const marksPanel = el.querySelector('[data-component-id="marks"]') as HTMLElement;
    expect(navPanel.style.display).not.toBe('none');
    expect(marksPanel.style.display).not.toBe('none');
  });

  it('single zone half active — fills zone, separator hidden', async () => {
    el = createDock({ leftPanels: twoZoneLeft });
    document.body.appendChild(el);
    await el.updateComplete;

    const leftZone = el.querySelector('.dock-zone-left') as HTMLElement;
    const separator = leftZone?.querySelector('[data-zone-separator]') as HTMLElement;
    expect(separator?.style.display).toBe('none');

    const navPanel = el.querySelector('[data-component-id="nav"]') as HTMLElement;
    expect(navPanel.style.display).not.toBe('none');
  });

  it('zone separator is draggable — has pointer event handlers', async () => {
    el = createDock({ leftPanels: twoZoneLeft });
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('marks');
    await el.updateComplete;

    const leftZone = el.querySelector('.dock-zone-left') as HTMLElement;
    const separator = leftZone.querySelector('[data-zone-separator]') as HTMLElement;
    expect(separator).toBeTruthy();
    expect(separator.getAttribute('style')).toContain('row-resize');
  });

  it('zone split defaults to 50/50 ratio', async () => {
    el = createDock({ leftPanels: twoZoneLeft });
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('marks');
    await el.updateComplete;

    const leftZone = el.querySelector('.dock-zone-left') as HTMLElement;
    const subDivs = Array.from(leftZone.querySelectorAll(':scope > div:not([data-zone-separator])'));
    const topStyle = (subDivs[0] as HTMLElement).getAttribute('style') ?? '';
    const botStyle = (subDivs[1] as HTMLElement).getAttribute('style') ?? '';
    const topMatch = topStyle.match(/flex:\s*0\s+0\s+([\d.]+)%/);
    const botMatch = botStyle.match(/flex:\s*0\s+0\s+([\d.]+)%/);
    expect(topMatch).toBeTruthy();
    expect(botMatch).toBeTruthy();
    expect(parseFloat(topMatch![1]!)).toBeCloseTo(50, 0);
    expect(parseFloat(botMatch![1]!)).toBeCloseTo(50, 0);
  });

  it('zone sub-containers have overflow auto to prevent content bleed', async () => {
    el = createDock({ leftPanels: twoZoneLeft });
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('marks');
    await el.updateComplete;

    const leftZone = el.querySelector('.dock-zone-left') as HTMLElement;
    const subDivs = leftZone.querySelectorAll(':scope > div:not([data-zone-separator])');
    for (const div of subDivs) {
      const style = (div as HTMLElement).getAttribute('style') ?? '';
      expect(style).toContain('overflow');
    }
  });

  it('content preserved when toggling zone halves', async () => {
    const renderContent = vi.fn((container: HTMLElement, panelId: string) => {
      container.textContent = `content:${panelId}`;
    });
    el = createDock({ leftPanels: twoZoneLeft, renderContent });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector('[data-component-id="nav"]')!.textContent).toBe('content:nav');

    el.showPanel('marks');
    await el.updateComplete;
    expect(el.querySelector('[data-component-id="nav"]')!.textContent).toBe('content:nav');
    expect(el.querySelector('[data-component-id="marks"]')!.textContent).toBe('content:marks');

    el.hidePanel('marks');
    await el.updateComplete;
    expect(el.querySelector('[data-component-id="nav"]')!.textContent).toBe('content:nav');
  });
});

describe('Bottom zone split', () => {
  let el: PagesDockWorkbench;

  const bottomLeftItem: DockItem = { icon: 'T', label: 'Console', panelId: 'console' };
  const bottomRightItem: DockItem = { icon: 'O', label: 'Output', panelId: 'output' };

  function makeBottomDock(): PagesDockWorkbench {
    const zoneMap = new Map([['console', 'bottom-left' as const], ['output', 'bottom-right' as const], ['nav', 'left-top' as const]]);
    const renderContent = vi.fn((container: HTMLElement, panelId: string) => {
      container.textContent = `content:${panelId}`;
    });
    return createDock({
      leftPanels: [{ icon: 'N', label: 'Nav', panelId: 'nav' }],
      bottomPanels: [bottomLeftItem, bottomRightItem],
      zoneMap,
      renderContent,
    });
  }

  afterEach(() => {
    el?.remove();
  });

  it('single active bottom panel fills full width — separator hidden', async () => {
    el = makeBottomDock();
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('console');
    await el.updateComplete;

    const bottomZone = el.querySelector('.dock-zone-bottom') as HTMLElement;
    expect(bottomZone.style.display).not.toBe('none');

    const consolePanelEl = el.querySelector('[data-component-id="console"]') as HTMLElement;
    expect(consolePanelEl.style.display).not.toBe('none');
    expect(consolePanelEl.textContent).toBe('content:console');

    const separator = bottomZone.querySelector('[data-bottom-separator]') as HTMLElement;
    expect(separator?.style.display).toBe('none');
  });

  it('both active bottom panels split with visible separator', async () => {
    el = makeBottomDock();
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('console');
    el.showPanel('output');
    await el.updateComplete;

    const bottomZone = el.querySelector('.dock-zone-bottom') as HTMLElement;
    const separator = bottomZone.querySelector('[data-bottom-separator]') as HTMLElement;
    expect(separator).toBeTruthy();
    expect(separator.style.display).not.toBe('none');
  });

  it('content preserved when toggling between single and split', async () => {
    el = makeBottomDock();
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('console');
    await el.updateComplete;
    expect(el.querySelector('[data-component-id="console"]')!.textContent).toBe('content:console');

    el.showPanel('output');
    await el.updateComplete;
    expect(el.querySelector('[data-component-id="console"]')!.textContent).toBe('content:console');
    expect(el.querySelector('[data-component-id="output"]')!.textContent).toBe('content:output');

    el.hidePanel('output');
    await el.updateComplete;
    expect(el.querySelector('[data-component-id="console"]')!.textContent).toBe('content:console');
  });

  it('closing one panel hides separator — remaining fills width', async () => {
    el = makeBottomDock();
    document.body.appendChild(el);
    await el.updateComplete;

    el.showPanel('console');
    el.showPanel('output');
    await el.updateComplete;

    el.hidePanel('output');
    await el.updateComplete;

    const separator = el.querySelector('[data-bottom-separator]') as HTMLElement;
    expect(separator?.style.display).toBe('none');
    expect(el.querySelector<HTMLElement>('[data-component-id="console"]')!.style.display).not.toBe('none');
  });
});

describe('Slide animation', () => {
  let el: PagesDockWorkbench;

  afterEach(() => {
    el?.remove();
  });

  it('dock styles include transition for zone containers', async () => {
    el = createDock({
      leftPanels: [{ icon: 'N', label: 'Nav', panelId: 'nav', defaultOpen: true }],
    });
    document.body.appendChild(el);
    await el.updateComplete;

    const styleEl = document.querySelector('style[data-pages-dock]');
    expect(styleEl).toBeTruthy();
    const css = styleEl!.textContent ?? '';
    expect(css).toContain('transition');
    expect(css).toMatch(/dock-zone-left.*transition.*width/s);
  });

  it('dock styles include transition for resize handles', async () => {
    el = createDock({
      leftPanels: [{ icon: 'N', label: 'Nav', panelId: 'nav', defaultOpen: true }],
    });
    document.body.appendChild(el);
    await el.updateComplete;

    const styleEl = document.querySelector('style[data-pages-dock]');
    const css = styleEl!.textContent ?? '';
    expect(css).toMatch(/resize-handle.*transition.*opacity/s);
  });
});

describe('Keyboard shortcuts', () => {
  let el: PagesDockWorkbench;

  afterEach(() => {
    el?.remove();
  });

  function pressAlt(key: string): void {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: true, bubbles: true }));
  }

  it('Alt+1 toggles the first panel (left-top)', async () => {
    el = createDock({
      leftPanels: [
        { icon: 'N', label: 'Nav', panelId: 'nav', defaultOpen: true },
        { icon: 'S', label: 'Search', panelId: 'search' },
      ],
      rightPanels: [
        { icon: 'P', label: 'Props', panelId: 'props' },
      ],
    });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.dockState['nav']).toBe(true);
    pressAlt('1');
    expect(el.dockState['nav']).toBe(false);
    pressAlt('1');
    expect(el.dockState['nav']).toBe(true);
  });

  it('Alt+2 toggles the second panel', async () => {
    el = createDock({
      leftPanels: [
        { icon: 'N', label: 'Nav', panelId: 'nav' },
        { icon: 'S', label: 'Search', panelId: 'search' },
      ],
    });
    document.body.appendChild(el);
    await el.updateComplete;

    pressAlt('2');
    expect(el.dockState['search']).toBe(true);
  });

  it('numbering spans across left then right panels', async () => {
    el = createDock({
      leftPanels: [{ icon: 'N', label: 'Nav', panelId: 'nav' }],
      rightPanels: [{ icon: 'P', label: 'Props', panelId: 'props' }],
    });
    document.body.appendChild(el);
    await el.updateComplete;

    pressAlt('1');
    expect(el.dockState['nav']).toBe(true);
    pressAlt('2');
    expect(el.dockState['props']).toBe(true);
  });

  it('ignores Alt+N beyond panel count', async () => {
    el = createDock({
      leftPanels: [{ icon: 'N', label: 'Nav', panelId: 'nav' }],
    });
    document.body.appendChild(el);
    await el.updateComplete;

    pressAlt('9');
    expect(Object.values(el.dockState).filter(v => v).length).toBe(0);
  });

  it('does not render empty bottom placeholder when no bottom items exist', async () => {
    el = createDock({ leftPanels: leftItems });
    document.body.appendChild(el);
    await el.updateComplete;

    const leftBar = el.querySelector('.dock-bar-left') as HTMLElement;
    expect(leftBar).toBeTruthy();
    expect(leftBar.querySelector('[data-dock-empty]')).toBeNull();
  });
});
