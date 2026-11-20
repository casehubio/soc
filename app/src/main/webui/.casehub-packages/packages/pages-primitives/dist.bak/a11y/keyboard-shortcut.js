const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
function isInTextInput() {
    const active = document.activeElement;
    if (!active)
        return false;
    if (INPUT_TAGS.has(active.tagName))
        return true;
    if (active.isContentEditable)
        return true;
    // Check shadow DOM
    const root = active.shadowRoot;
    if (root) {
        const inner = root.activeElement;
        if (inner && (INPUT_TAGS.has(inner.tagName) || inner.isContentEditable)) {
            return true;
        }
    }
    return false;
}
export function KeyboardShortcutMixin(Base) {
    class KeyboardShortcutHost extends Base {
        constructor() {
            super(...arguments);
            this._shortcuts = [];
            this._handleShortcutKeydown = (e) => {
                for (const shortcut of this._shortcuts) {
                    if (e.key === shortcut.key) {
                        if (!shortcut.requiresModifier && isInTextInput())
                            return;
                        e.preventDefault();
                        shortcut.handler();
                        return;
                    }
                }
            };
        }
        registerShortcut(key, handler, opts) {
            const registration = {
                key,
                handler,
                description: opts.description,
                ...(opts.requiresModifier !== undefined && { requiresModifier: opts.requiresModifier })
            };
            this._shortcuts.push(registration);
        }
        unregisterShortcut(key) {
            this._shortcuts = this._shortcuts.filter(s => s.key !== key);
        }
        getShortcuts() {
            return this._shortcuts.map(s => ({ key: s.key, description: s.description }));
        }
        connectedCallback() {
            super.connectedCallback();
            document.addEventListener('keydown', this._handleShortcutKeydown);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            document.removeEventListener('keydown', this._handleShortcutKeydown);
        }
    }
    return KeyboardShortcutHost;
}
//# sourceMappingURL=keyboard-shortcut.js.map