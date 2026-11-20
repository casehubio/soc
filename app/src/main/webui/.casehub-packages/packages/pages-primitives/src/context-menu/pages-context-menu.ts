import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FocusTrapMixin } from '../a11y/focus-trap.js';

export interface MenuItem {
  label: string;
  action?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  children?: MenuItem[];
}

export class PagesContextMenu extends FocusTrapMixin(LitElement) {
  @property({ attribute: false }) items: MenuItem[] = [];
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) anchor: HTMLElement | undefined;

  @state() private _activeSubmenu: string | undefined;

  private _outsideClickHandler = (e: MouseEvent) => this._handleOutsideClick(e);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._outsideClickHandler, true);
    document.addEventListener('contextmenu', this._outsideClickHandler, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._outsideClickHandler, true);
    document.removeEventListener('contextmenu', this._outsideClickHandler, true);
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (changed.has('open') && this.open) {
      this._activeSubmenu = undefined;
      void this.updateComplete.then(() => {
        const firstItem = this.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]');
        firstItem?.focus();
      });
    }
  }

  private _handleOutsideClick(e: MouseEvent): void {
    if (!this.open) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._close();
    }
  }

  private _close(): void {
    this.open = false;
    this._activeSubmenu = undefined;
    this.dispatchEvent(new CustomEvent('menu-close', { bubbles: true, composed: true }));
  }

  private _handleAction(item: MenuItem): void {
    if (item.disabled || item.children) return;
    this.dispatchEvent(new CustomEvent('menu-action', {
      bubbles: true, composed: true,
      detail: { action: item.action },
    }));
    this._close();
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this._close();
    }
  }

  private _handleSubmenuEnter(label: string): void {
    this._activeSubmenu = label;
  }

  private _handleSubmenuLeave(): void {
    this._activeSubmenu = undefined;
  }

  private _renderItem(item: MenuItem): TemplateResult {
    if (item.separator) {
      return html`<div class="menu-separator" role="separator"></div>`;
    }

    if (item.children) {
      return html`
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
          ${this._activeSubmenu === item.label ? html`
            <div class="submenu" role="menu" aria-label="${item.label}">
              ${item.children.map(child => this._renderItem(child))}
            </div>
          ` : nothing}
        </div>
      `;
    }

    return html`
      <div
        class="menu-item${item.disabled ? ' disabled' : ''}"
        role="menuitem"
        tabindex="-1"
        aria-disabled="${item.disabled ?? false}"
        @click="${() => this._handleAction(item)}"
      >
        <span class="item-label">${item.label}</span>
        ${item.shortcut ? html`<span class="item-shortcut">${item.shortcut}</span>` : nothing}
      </div>
    `;
  }

  override render(): TemplateResult {
    if (!this.open) return html``;

    return html`
      <div class="menu-container" role="menu" aria-label="Context menu" @keydown="${this._handleKeydown}">
        ${this.items.map(item => this._renderItem(item))}
      </div>
    `;
  }

  static override styles = css`
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
  `;
}

if (!customElements.get('pages-context-menu')) {
  customElements.define('pages-context-menu', PagesContextMenu);
}
