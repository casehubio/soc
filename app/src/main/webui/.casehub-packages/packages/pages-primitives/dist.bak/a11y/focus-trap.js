const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function getDeepActiveElement() {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement;
    }
    return active;
}
function collectFocusable(root) {
    const result = [];
    function walk(node) {
        if (node instanceof HTMLSlotElement) {
            for (const assigned of node.assignedElements({ flatten: true })) {
                walk(assigned);
            }
            return;
        }
        if (node.matches(FOCUSABLE)) {
            result.push(node);
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
export function FocusTrapMixin(Base) {
    class FocusTrapHost extends Base {
        constructor() {
            super(...arguments);
            this._trapContainer = null;
            this._previousFocus = null;
            this._handleTrapKeydown = (e) => {
                if (e.key !== 'Tab' || !this._trapContainer)
                    return;
                const focusable = collectFocusable(this._trapContainer);
                if (focusable.length === 0)
                    return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const active = getDeepActiveElement();
                if (e.shiftKey && active === first) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && active === last) {
                    e.preventDefault();
                    first.focus();
                }
            };
        }
        trapFocus(container) {
            this._previousFocus = document.activeElement;
            this._trapContainer = container;
            document.addEventListener('keydown', this._handleTrapKeydown);
            const focusable = collectFocusable(container);
            focusable[0]?.focus();
        }
        releaseFocus() {
            document.removeEventListener('keydown', this._handleTrapKeydown);
            this._trapContainer = null;
            if (this._previousFocus instanceof HTMLElement) {
                this._previousFocus.focus();
            }
            this._previousFocus = null;
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            if (this._trapContainer) {
                this.releaseFocus();
            }
        }
    }
    return FocusTrapHost;
}
//# sourceMappingURL=focus-trap.js.map