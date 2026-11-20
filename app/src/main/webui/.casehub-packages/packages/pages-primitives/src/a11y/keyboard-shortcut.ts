import type { LitElement } from 'lit';

type Constructor<T = LitElement> = new (...args: any[]) => T;

interface ShortcutRegistration {
  readonly key: string;
  readonly handler: () => void;
  readonly description: string;
  readonly requiresModifier?: boolean;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isInTextInput(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (INPUT_TAGS.has(active.tagName)) return true;
  if ((active as HTMLElement).isContentEditable) return true;
  // Check shadow DOM
  const root = active.shadowRoot;
  if (root) {
    const inner = root.activeElement;
    if (inner && (INPUT_TAGS.has(inner.tagName) || (inner as HTMLElement).isContentEditable)) {
      return true;
    }
  }
  return false;
}

export function KeyboardShortcutMixin<T extends Constructor>(Base: T) {
  class KeyboardShortcutHost extends Base {
    private _shortcuts: ShortcutRegistration[] = [];

    registerShortcut(key: string, handler: () => void, opts: { description: string; requiresModifier?: boolean }): void {
      const registration: ShortcutRegistration = {
        key,
        handler,
        description: opts.description,
        ...(opts.requiresModifier !== undefined && { requiresModifier: opts.requiresModifier })
      };
      this._shortcuts.push(registration);
    }

    unregisterShortcut(key: string): void {
      this._shortcuts = this._shortcuts.filter(s => s.key !== key);
    }

    getShortcuts(): Array<{ key: string; description: string }> {
      return this._shortcuts.map(s => ({ key: s.key, description: s.description }));
    }

    override connectedCallback(): void {
      super.connectedCallback();
      document.addEventListener('keydown', this._handleShortcutKeydown);
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      document.removeEventListener('keydown', this._handleShortcutKeydown);
    }

    private _handleShortcutKeydown = (e: KeyboardEvent): void => {
      for (const shortcut of this._shortcuts) {
        if (e.key === shortcut.key) {
          if (!shortcut.requiresModifier && isInTextInput()) return;
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };
  }

  return KeyboardShortcutHost as unknown as Constructor<{
    registerShortcut(key: string, handler: () => void, opts: { description: string; requiresModifier?: boolean }): void;
    unregisterShortcut(key: string): void;
    getShortcuts(): Array<{ key: string; description: string }>;
  }> & T;
}
