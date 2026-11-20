import type { LitElement } from 'lit';

type Constructor<T = LitElement> = new (...args: any[]) => T;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getDeepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

function collectFocusable(root: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];

  function walk(node: Element): void {
    if (node instanceof HTMLSlotElement) {
      for (const assigned of node.assignedElements({ flatten: true })) {
        walk(assigned);
      }
      return;
    }
    if (node.matches(FOCUSABLE)) {
      result.push(node as HTMLElement);
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const child of root.children) {
    walk(child);
  }
  return result;
}

export function FocusTrapMixin<T extends Constructor>(Base: T) {
  class FocusTrapHost extends Base {
    private _trapContainer: HTMLElement | null = null;
    private _previousFocus: Element | null = null;

    trapFocus(container: HTMLElement): void {
      this._previousFocus = document.activeElement;
      this._trapContainer = container;
      document.addEventListener('keydown', this._handleTrapKeydown);
      const focusable = collectFocusable(container);
      focusable[0]?.focus();
    }

    releaseFocus(): void {
      document.removeEventListener('keydown', this._handleTrapKeydown);
      this._trapContainer = null;
      if (this._previousFocus instanceof HTMLElement) {
        this._previousFocus.focus();
      }
      this._previousFocus = null;
    }

    private _handleTrapKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab' || !this._trapContainer) return;

      const focusable = collectFocusable(this._trapContainer);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = getDeepActiveElement();

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      if (this._trapContainer) {
        this.releaseFocus();
      }
    }
  }

  return FocusTrapHost as unknown as Constructor<{
    trapFocus(container: HTMLElement): void;
    releaseFocus(): void;
  }> & T;
}
