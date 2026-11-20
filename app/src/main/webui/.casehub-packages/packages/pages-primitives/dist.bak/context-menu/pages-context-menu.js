var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FocusTrapMixin } from '../a11y/focus-trap.js';
export class PagesContextMenu extends FocusTrapMixin(LitElement) {
    constructor() {
        super(...arguments);
        this.items = [];
        this.open = false;
        this._outsideClickHandler = (e) => this._handleOutsideClick(e);
    }
    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._outsideClickHandler, true);
        document.addEventListener('contextmenu', this._outsideClickHandler, true);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._outsideClickHandler, true);
        document.removeEventListener('contextmenu', this._outsideClickHandler, true);
    }
    updated(changed) {
        super.updated(changed);
        if (changed.has('open') && this.open) {
            this._activeSubmenu = undefined;
            void this.updateComplete.then(() => {
                const firstItem = this.shadowRoot?.querySelector('[role="menuitem"]');
                firstItem?.focus();
            });
        }
    }
    _handleOutsideClick(e) {
        if (!this.open)
            return;
        const path = e.composedPath();
        if (!path.includes(this)) {
            this._close();
        }
    }
    _close() {
        this.open = false;
        this._activeSubmenu = undefined;
        this.dispatchEvent(new CustomEvent('menu-close', { bubbles: true, composed: true }));
    }
    _handleAction(item) {
        if (item.disabled || item.children)
            return;
        this.dispatchEvent(new CustomEvent('menu-action', {
            bubbles: true, composed: true,
            detail: { action: item.action },
        }));
        this._close();
    }
    _handleKeydown(e) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            this._close();
        }
    }
    _handleSubmenuEnter(label) {
        this._activeSubmenu = label;
    }
    _handleSubmenuLeave() {
        this._activeSubmenu = undefined;
    }
    _renderItem(item) {
        if (item.separator) {
            return html `<div class="menu-separator" role="separator"></div>`;
        }
        if (item.children) {
            return html `
        <div
          class="menu-item has-submenu"
          role="menuitem"
          tabindex="-1"
          aria-haspopup="true"
          aria-expanded="${this._activeSubmenu === item.label}"
          @mouseenter="${() => this._handleSubmenuEnter(item.label)}"
          @mouseleave="${() => this._handleSubmenuLeave()}"
          @focus="${() => this._handleSubmenuEnter(item.label)}"
        >
          <span class="item-label">${item.label}</span>
          <span class="item-arrow">▸</span>
          ${this._activeSubmenu === item.label ? html `
            <div class="submenu" role="menu" aria-label="${item.label}">
              ${item.children.map(child => this._renderItem(child))}
            </div>
          ` : nothing}
        </div>
      `;
        }
        return html `
      <div
        class="menu-item${item.disabled ? ' disabled' : ''}"
        role="menuitem"
        tabindex="-1"
        aria-disabled="${item.disabled ?? false}"
        @click="${() => this._handleAction(item)}"
      >
        <span class="item-label">${item.label}</span>
        ${item.shortcut ? html `<span class="item-shortcut">${item.shortcut}</span>` : nothing}
      </div>
    `;
    }
    render() {
        if (!this.open)
            return html ``;
        return html `
      <div class="menu-container" role="menu" aria-label="Context menu" @keydown="${this._handleKeydown}">
        ${this.items.map(item => this._renderItem(item))}
      </div>
    `;
    }
    static { this.styles = css `
    :host {
      position: absolute;
      z-index: 1100;
      font-family: var(--pages-font-family, sans-serif);
      font-size: var(--pages-font-size-sm, 13px);
    }

    :host(:not([open])) {
      display: none;
    }

    .menu-container {
      min-width: 180px;
      background: var(--pages-surface-bg, #fff);
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: var(--pages-radius-md, 8px);
      box-shadow: var(--pages-shadow-3, 0 4px 16px rgba(0, 0, 0, 0.12));
      padding: 4px 0;
      outline: none;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      cursor: pointer;
      outline: none;
      position: relative;
    }

    .menu-item:hover,
    .menu-item:focus {
      background: var(--pages-hover-bg, #f1f3f4);
    }

    .menu-item.disabled {
      opacity: 0.5;
      cursor: default;
    }

    .menu-item.disabled:hover {
      background: none;
    }

    .item-label {
      flex: 1;
    }

    .item-shortcut {
      color: var(--pages-text-secondary, #5f6368);
      font-size: 11px;
    }

    .item-arrow {
      color: var(--pages-text-secondary, #5f6368);
    }

    .menu-separator {
      height: 1px;
      background: var(--pages-border-color, #dadce0);
      margin: 4px 0;
    }

    .submenu {
      position: absolute;
      left: 100%;
      top: -4px;
      min-width: 160px;
      background: var(--pages-surface-bg, #fff);
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: var(--pages-radius-md, 8px);
      box-shadow: var(--pages-shadow-3, 0 4px 16px rgba(0, 0, 0, 0.12));
      padding: 4px 0;
    }

    .has-submenu {
      position: relative;
    }
  `; }
}
__decorate([
    property({ attribute: false })
], PagesContextMenu.prototype, "items", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], PagesContextMenu.prototype, "open", void 0);
__decorate([
    property({ attribute: false })
], PagesContextMenu.prototype, "anchor", void 0);
__decorate([
    state()
], PagesContextMenu.prototype, "_activeSubmenu", void 0);
if (!customElements.get('pages-context-menu')) {
    customElements.define('pages-context-menu', PagesContextMenu);
}
//# sourceMappingURL=pages-context-menu.js.map