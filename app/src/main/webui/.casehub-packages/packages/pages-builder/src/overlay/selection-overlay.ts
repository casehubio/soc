import type { TreeNodeType } from '../tree/builder-tree.js';

type ButtonDef = readonly [cls: string, label: string, event: string];

const ALL_BUTTONS: ButtonDef[] = [
  ['sel-add-btn', '+', 'selection-add'],
  ['sel-insert-btn', '↓', 'selection-insert'],
  ['sel-cut-btn', '✂', 'selection-cut'],
  ['sel-copy-btn', '⎘', 'selection-copy'],
  ['sel-delete-btn', '✕', 'selection-delete'],
];

function getButtonsForNodeType(
  nodeType: TreeNodeType,
  isContainer: boolean,
): ButtonDef[] {
  if (nodeType === 'page') {
    return ALL_BUTTONS.filter(([, , evt]) =>
      evt === 'selection-add' || evt === 'selection-delete');
  }
  if (nodeType === 'component' && !isContainer) {
    return ALL_BUTTONS.filter(([, , evt]) => evt !== 'selection-add');
  }
  return ALL_BUTTONS;
}

const BTN_STYLE = `
  width: 20px; height: 20px; border: 1px solid #dadce0;
  border-radius: 4px; background: #fff; color: #5f6368;
  cursor: pointer; font-size: 12px; line-height: 1; padding: 0;
  display: flex; align-items: center; justify-content: center;
`;

export class SelectionOverlay {
  private _overlayRoot: HTMLElement;
  private _overlay: HTMLElement | null = null;
  private _insertionPoints: HTMLElement[] = [];

  constructor(overlayRoot: HTMLElement) {
    this._overlayRoot = overlayRoot;
  }

  update(
    bounds: DOMRect,
    nodeType: TreeNodeType,
    path: readonly (string | number)[],
    options?: { isContainer?: boolean },
  ): void {
    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.className = 'builder-scope-overlay';
      this._overlayRoot.appendChild(this._overlay);
    }

    this._overlay.style.cssText = `
      position: absolute; pointer-events: none;
      left: ${bounds.x}px; top: ${bounds.y}px;
      width: ${bounds.width}px; height: ${bounds.height}px;
      outline: 2px solid var(--pages-primary, #4285f4);
      outline-offset: 0;
      border-radius: 6px;
      background: rgba(66, 133, 244, 0.04);
      z-index: 10;
      transition: all 0.15s ease;
    `;

    this._overlay.innerHTML = '';
    const toolbar = document.createElement('div');
    toolbar.className = 'selection-toolbar';
    toolbar.style.cssText = `
      position: absolute; top: -2px; right: -2px;
      display: flex; align-items: center;
      pointer-events: auto; z-index: 11;
    `;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'toolbar-buttons';
    buttonsContainer.style.cssText = `
      display: flex; gap: 2px;
      max-width: 0; overflow: hidden; opacity: 0;
      transition: max-width 150ms ease, opacity 150ms ease;
    `;

    const buttons = getButtonsForNodeType(nodeType, options?.isContainer ?? false);
    for (const [cls, label, eventName] of buttons) {
      const btn = document.createElement('button');
      btn.className = cls;
      btn.textContent = label;
      btn.style.cssText = BTN_STYLE;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._overlayRoot.dispatchEvent(new CustomEvent(eventName, {
          bubbles: true,
          detail: { path, nodeType, target: btn },
        }));
      });
      buttonsContainer.appendChild(btn);
    }

    const trigger = document.createElement('div');
    trigger.className = 'toolbar-trigger';
    trigger.textContent = '⋮';
    trigger.style.cssText = `
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 14px; font-weight: bold;
      color: #5f6368; background: #fff;
      border: 1px solid #dadce0; border-radius: 4px;
    `;

    toolbar.appendChild(buttonsContainer);
    toolbar.appendChild(trigger);

    toolbar.addEventListener('mouseenter', () => {
      buttonsContainer.style.maxWidth = '200px';
      buttonsContainer.style.opacity = '1';
    });
    toolbar.addEventListener('mouseleave', () => {
      buttonsContainer.style.maxWidth = '0';
      buttonsContainer.style.opacity = '0';
    });

    this._overlay.appendChild(toolbar);
  }

  hide(): void {
    if (this._overlay) this._overlay.style.display = 'none';
    this.hideInsertionPoints();
  }

  setInsertMode(_fragmentType: string): void {
    this._overlay?.classList.add('paste-target');
  }

  clearInsertMode(): void {
    this._overlay?.classList.remove('paste-target');
  }

  showInsertionPoints(
    childBounds: DOMRect[],
    parentPath: readonly (string | number)[],
    parentNodeType: TreeNodeType,
  ): void {
    this.hideInsertionPoints();

    const overlayLeft = this._overlay ? parseFloat(this._overlay.style.left) : 0;
    const overlayWidth = this._overlay ? parseFloat(this._overlay.style.width) : 300;
    const overlayTop = this._overlay ? parseFloat(this._overlay.style.top) : 0;
    const overlayHeight = this._overlay ? parseFloat(this._overlay.style.height) : 200;

    const count = childBounds.length + 1;
    for (let i = 0; i < count; i++) {
      let top: number;
      if (childBounds.length === 0) {
        top = overlayTop + overlayHeight / 2;
      } else if (i === 0) {
        top = childBounds[0]!.top - 6;
      } else if (i === childBounds.length) {
        top = childBounds[i - 1]!.bottom + 2;
      } else {
        top = (childBounds[i - 1]!.bottom + childBounds[i]!.top) / 2;
      }

      const point = document.createElement('div');
      point.className = 'visual-insertion-point';
      point.setAttribute('role', 'button');
      point.setAttribute('aria-label', `Insert at position ${i}`);
      point.dataset.index = String(i);
      point.style.cssText = `
        position: absolute;
        left: ${overlayLeft}px;
        top: ${top - 6}px;
        width: ${overlayWidth}px;
        height: 12px;
        display: flex;
        align-items: center;
        cursor: pointer;
        opacity: 0.3;
        transition: opacity 150ms ease;
        pointer-events: auto;
        z-index: 11;
      `;

      const lineL = document.createElement('span');
      lineL.style.cssText = 'flex: 1; height: 1px; background: var(--pages-primary, #4285f4);';
      const icon = document.createElement('span');
      icon.textContent = '+';
      icon.style.cssText = 'font-size: 10px; color: var(--pages-primary, #4285f4); padding: 0 4px; font-weight: bold;';
      const lineR = document.createElement('span');
      lineR.style.cssText = 'flex: 1; height: 1px; background: var(--pages-primary, #4285f4);';

      point.appendChild(lineL);
      point.appendChild(icon);
      point.appendChild(lineR);

      point.addEventListener('mouseenter', () => { point.style.opacity = '1'; });
      point.addEventListener('mouseleave', () => { point.style.opacity = '0.3'; });

      const idx = i;
      point.addEventListener('click', (e) => {
        e.stopPropagation();
        this._overlayRoot.dispatchEvent(new CustomEvent('selection-insert-at', {
          bubbles: true,
          detail: { parentPath, index: idx, parentNodeType, target: point },
        }));
      });

      this._overlayRoot.appendChild(point);
      this._insertionPoints.push(point);
    }
  }

  hideInsertionPoints(): void {
    for (const p of this._insertionPoints) p.remove();
    this._insertionPoints = [];
  }

  dispose(): void {
    this.hideInsertionPoints();
    this._overlay?.remove();
    this._overlay = null;
  }
}
