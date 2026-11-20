import { describe, it, expect, afterEach } from 'vitest';
import { SelectionOverlay } from './selection-overlay.js';

describe('SelectionOverlay', () => {
  let overlayRoot: HTMLDivElement;
  let overlay: SelectionOverlay;

  afterEach(() => {
    overlay?.dispose();
    overlayRoot?.remove();
  });

  function setup(): void {
    overlayRoot = document.createElement('div');
    document.body.appendChild(overlayRoot);
    overlay = new SelectionOverlay(overlayRoot);
  }

  function makeBounds(x = 10, y = 20, w = 200, h = 100): DOMRect {
    return new DOMRect(x, y, w, h);
  }

  it('update renders scope outline at given bounds', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    const el = overlayRoot.querySelector('.builder-scope-overlay') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.display).not.toBe('none');
  });

  it('update renders toolbar trigger icon', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    const trigger = overlayRoot.querySelector('.toolbar-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger!.textContent).toBe('⋮');
  });

  it('renders all 5 buttons for container component', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0], { isContainer: true });
    expect(overlayRoot.querySelector('.sel-add-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-insert-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-cut-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-copy-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-delete-btn')).toBeTruthy();
  });

  it('omits add button for non-container component', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    expect(overlayRoot.querySelector('.sel-add-btn')).toBeNull();
    expect(overlayRoot.querySelector('.sel-insert-btn')).toBeTruthy();
  });

  it('omits insert/cut/copy for page node type', () => {
    setup();
    overlay.update(makeBounds(), 'page', ['pages', 0]);
    expect(overlayRoot.querySelector('.sel-add-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-insert-btn')).toBeNull();
    expect(overlayRoot.querySelector('.sel-cut-btn')).toBeNull();
    expect(overlayRoot.querySelector('.sel-copy-btn')).toBeNull();
    expect(overlayRoot.querySelector('.sel-delete-btn')).toBeTruthy();
  });

  it('shows all structural buttons for row node type', () => {
    setup();
    overlay.update(makeBounds(), 'row', ['pages', 0, 'rows', 0]);
    expect(overlayRoot.querySelector('.sel-add-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-insert-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-cut-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-copy-btn')).toBeTruthy();
    expect(overlayRoot.querySelector('.sel-delete-btn')).toBeTruthy();
  });

  it('dispatches selection-cut on cut button click', () => {
    setup();
    const path = ['pages', 0, 'components', 0] as const;
    overlay.update(makeBounds(), 'component', path);
    const events: CustomEvent[] = [];
    overlayRoot.addEventListener('selection-cut', (e: Event) => { events.push(e as CustomEvent); });
    (overlayRoot.querySelector('.sel-cut-btn') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.path).toEqual(path);
    expect(events[0]!.detail.nodeType).toBe('component');
  });

  it('dispatches selection-add on add button click', () => {
    setup();
    const path = ['pages', 0] as const;
    overlay.update(makeBounds(), 'page', path);
    const events: CustomEvent[] = [];
    overlayRoot.addEventListener('selection-add', (e: Event) => { events.push(e as CustomEvent); });
    (overlayRoot.querySelector('.sel-add-btn') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.nodeType).toBe('page');
  });

  it('dispatches selection-copy on copy button click', () => {
    setup();
    overlay.update(makeBounds(), 'row', ['pages', 0, 'rows', 0]);
    const events: CustomEvent[] = [];
    overlayRoot.addEventListener('selection-copy', (e: Event) => { events.push(e as CustomEvent); });
    (overlayRoot.querySelector('.sel-copy-btn') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
  });

  it('dispatches selection-insert on insert button click', () => {
    setup();
    overlay.update(makeBounds(), 'column', ['pages', 0, 'rows', 0, 'columns', 0]);
    const events: CustomEvent[] = [];
    overlayRoot.addEventListener('selection-insert', (e: Event) => { events.push(e as CustomEvent); });
    (overlayRoot.querySelector('.sel-insert-btn') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
  });

  it('dispatches selection-delete on delete button click', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    const events: CustomEvent[] = [];
    overlayRoot.addEventListener('selection-delete', (e: Event) => { events.push(e as CustomEvent); });
    (overlayRoot.querySelector('.sel-delete-btn') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
  });

  it('hide makes overlay invisible', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    overlay.hide();
    const el = overlayRoot.querySelector('.builder-scope-overlay') as HTMLElement;
    expect(el.style.display).toBe('none');
  });

  it('setInsertMode adds paste-target class', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    overlay.setInsertMode('component');
    const el = overlayRoot.querySelector('.builder-scope-overlay') as HTMLElement;
    expect(el.classList.contains('paste-target')).toBe(true);
  });

  it('clearInsertMode removes paste-target class', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    overlay.setInsertMode('component');
    overlay.clearInsertMode();
    const el = overlayRoot.querySelector('.builder-scope-overlay') as HTMLElement;
    expect(el.classList.contains('paste-target')).toBe(false);
  });

  it('dispose removes overlay from DOM', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    expect(overlayRoot.querySelector('.builder-scope-overlay')).toBeTruthy();
    overlay.dispose();
    expect(overlayRoot.querySelector('.builder-scope-overlay')).toBeNull();
  });

  it('update reuses existing overlay element', () => {
    setup();
    overlay.update(makeBounds(10, 20, 200, 100), 'component', ['pages', 0, 'components', 0]);
    const el1 = overlayRoot.querySelector('.builder-scope-overlay');
    overlay.update(makeBounds(50, 60, 300, 150), 'row', ['pages', 0, 'rows', 0]);
    const el2 = overlayRoot.querySelector('.builder-scope-overlay');
    expect(el1).toBe(el2);
  });

  it('toolbar has pointer-events auto', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    const toolbar = overlayRoot.querySelector('.selection-toolbar') as HTMLElement;
    expect(toolbar.style.pointerEvents).toBe('auto');
  });

  it('scope overlay is pointer-events none', () => {
    setup();
    overlay.update(makeBounds(), 'component', ['pages', 0, 'components', 0]);
    const el = overlayRoot.querySelector('.builder-scope-overlay') as HTMLElement;
    expect(el.style.pointerEvents).toBe('none');
  });

  describe('insertion points', () => {
    it('showInsertionPoints renders N+1 indicators for N children', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      const childBounds = [
        new DOMRect(10, 10, 280, 80),
        new DOMRect(10, 100, 280, 80),
        new DOMRect(10, 190, 280, 80),
      ];
      overlay.showInsertionPoints(childBounds, ['pages', 0, 'columns', 0], 'column');
      const points = overlayRoot.querySelectorAll('.visual-insertion-point');
      expect(points.length).toBe(4);
    });

    it('renders 2 indicators for 1 child', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 200), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      const points = overlayRoot.querySelectorAll('.visual-insertion-point');
      expect(points.length).toBe(2);
    });

    it('renders 1 indicator for 0 children', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 200), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints([], ['pages', 0, 'columns', 0], 'column');
      const points = overlayRoot.querySelectorAll('.visual-insertion-point');
      expect(points.length).toBe(1);
    });

    it('insertion point click dispatches selection-insert-at', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80), new DOMRect(10, 100, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );

      let detail: any;
      overlayRoot.addEventListener('selection-insert-at', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      const point = overlayRoot.querySelector('.visual-insertion-point') as HTMLElement;
      point.click();
      expect(detail).toBeTruthy();
      expect(detail.index).toBe(0);
      expect(detail.parentNodeType).toBe('column');
      expect(detail.target).toBe(point);
    });

    it('hideInsertionPoints removes all indicators', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      expect(overlayRoot.querySelectorAll('.visual-insertion-point').length).toBe(2);

      overlay.hideInsertionPoints();
      expect(overlayRoot.querySelectorAll('.visual-insertion-point').length).toBe(0);
    });

    it('hide() also hides insertion points', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      overlay.hide();
      expect(overlayRoot.querySelectorAll('.visual-insertion-point').length).toBe(0);
    });

    it('dispose() cleans up insertion points', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      overlay.dispose();
      expect(overlayRoot.querySelectorAll('.visual-insertion-point').length).toBe(0);
    });

    it('insertion points have ARIA attributes', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      const point = overlayRoot.querySelector('.visual-insertion-point');
      expect(point?.getAttribute('role')).toBe('button');
      expect(point?.getAttribute('aria-label')).toContain('Insert');
    });

    it('showInsertionPoints replaces previous insertion points', () => {
      setup();
      overlay.update(makeBounds(0, 0, 300, 400), 'column', ['pages', 0, 'columns', 0], { isContainer: true });
      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80), new DOMRect(10, 100, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      expect(overlayRoot.querySelectorAll('.visual-insertion-point').length).toBe(3);

      overlay.showInsertionPoints(
        [new DOMRect(10, 10, 280, 80)],
        ['pages', 0, 'columns', 0],
        'column',
      );
      expect(overlayRoot.querySelectorAll('.visual-insertion-point').length).toBe(2);
    });
  });
});
