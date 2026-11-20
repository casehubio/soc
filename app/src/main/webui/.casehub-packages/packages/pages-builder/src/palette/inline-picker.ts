import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type ComponentCatalogEntry, type FilteredCatalogEntry } from '../catalog/component-catalog.js';
import type { PaletteContext } from '../catalog/palette-context.js';
import { filterCatalog, getCatalogCategories } from './palette-filter.js';

@customElement('pages-builder-inline-picker')
export class PagesBuilderInlinePicker extends LitElement {
  @property({ attribute: false }) context: PaletteContext | undefined;
  @property({ attribute: false }) anchor: HTMLElement | undefined;
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _search = '';
  @state() private _activeCategory: string | undefined;

  private _filtered: readonly FilteredCatalogEntry[] = [];
  private _categories: readonly string[] = [];
  private _outsideClickHandler = (e: MouseEvent) => this._handleOutsideClick(e);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._outsideClickHandler, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._outsideClickHandler, true);
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('context') || changed.has('_search') || changed.has('_activeCategory')) {
      this._recompute();
    }
    if (changed.has('open') && this.open) {
      this._search = '';
      this._activeCategory = undefined;
      this._recompute();
      this._positionNearAnchor();
      void this.updateComplete.then(() => {
        this.shadowRoot?.querySelector<HTMLInputElement>('.picker-search')?.focus();
      });
    }
  }

  private _positionNearAnchor(): void {
    if (!this.anchor) return;
    const anchorRect = this.anchor.getBoundingClientRect();
    const parentRect = this.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };
    this.style.top = `${anchorRect.bottom - parentRect.top}px`;
    this.style.left = `${anchorRect.left - parentRect.left}px`;
  }

  private _recompute(): void {
    const ctx = this.context ?? {
      parentType: undefined,
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
    };
    const allForContext = filterCatalog(ctx);
    const populatedCategories = new Set(allForContext.map(e => e.entry.category));
    this._categories = getCatalogCategories().filter(c => populatedCategories.has(c));
    if (this._activeCategory && !populatedCategories.has(this._activeCategory)) {
      this._activeCategory = undefined;
    }
    this._filtered = filterCatalog(ctx, {
      ...(this._search ? { search: this._search } : {}),
      ...(this._activeCategory ? { category: this._activeCategory } : {}),
    });
  }

  private _handleOutsideClick(e: MouseEvent): void {
    if (!this.open) return;
    const path = e.composedPath();
    if (!path.includes(this) && !path.includes(this.anchor!)) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('picker-close', { bubbles: true, composed: true }));
    }
  }

  private _handleSearch(e: InputEvent): void {
    this._search = (e.target as HTMLInputElement).value;
  }

  private _handleSelect(entry: ComponentCatalogEntry): void {
    this.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: entry,
    }));
    this.open = false;
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open = false;
      this.dispatchEvent(new CustomEvent('picker-close', { bubbles: true, composed: true }));
    }
  }

  override render(): TemplateResult {
    if (!this.open) return html``;

    return html`
      <div class="picker-popover" role="listbox" aria-label="Component picker" @keydown=${this._handleKeydown}>
        <input
          class="picker-search"
          type="text"
          placeholder="Search..."
          .value=${this._search}
          @input=${this._handleSearch}
          aria-label="Search components"
        />

        <div class="picker-categories">
          <button
            class="cat-chip${this._activeCategory === undefined ? ' active' : ''}"
            @click=${() => { this._activeCategory = undefined; }}
          >All</button>
          ${this._categories.map(cat => html`
            <button
              class="cat-chip${this._activeCategory === cat ? ' active' : ''}"
              @click=${() => { this._activeCategory = this._activeCategory === cat ? undefined : cat; }}
            >${cat}</button>
          `)}
        </div>

        <div class="picker-list">
          ${this._filtered.length > 0
            ? this._filtered.map(item => html`
                <button
                  class="picker-item ${item.relevance}"
                  role="option"
                  @click=${() => this._handleSelect(item.entry)}
                >
                  <span class="item-label">${item.entry.label}</span>
                  <span class="item-type">${item.entry.type}</span>
                  ${item.relevance === 'needs-prereq' && item.entry.prereqHint
                    ? html`<span class="item-hint">${item.entry.prereqHint}</span>`
                    : nothing}
                </button>
              `)
            : html`<div class="picker-empty">No matches</div>`
          }
        </div>
      </div>
    `;
  }

  static override styles = css`
    :host {
      position: absolute;
      z-index: 1000;
      font-family: var(--pages-font-family, sans-serif);
      font-size: var(--pages-font-size-sm, 13px);
    }

    :host(:not([open])) {
      display: none;
    }

    .picker-popover {
      width: 280px;
      max-height: 360px;
      display: flex;
      flex-direction: column;
      background: var(--pages-surface-bg, #fff);
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: var(--pages-radius-md, 8px);
      box-shadow: var(--pages-shadow-3, 0 4px 16px rgba(0, 0, 0, 0.12));
      overflow: hidden;
    }

    .picker-search {
      margin: 8px;
      padding: 6px 10px;
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: inherit;
      outline: none;
    }

    .picker-search:focus {
      border-color: var(--pages-focus-ring, #4285f4);
    }

    .picker-categories {
      display: flex;
      gap: 4px;
      padding: 0 8px 8px;
      overflow-x: auto;
      flex-shrink: 0;
    }

    .cat-chip {
      padding: 2px 8px;
      border: none;
      border-radius: 12px;
      background: var(--pages-chip-bg, #f1f3f4);
      color: var(--pages-text-secondary, #5f6368);
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
    }

    .cat-chip.active {
      background: var(--pages-primary, #1967d2);
      color: #fff;
    }

    .picker-list {
      overflow-y: auto;
      flex: 1;
      padding: 4px 8px 8px;
    }

    .picker-item {
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 6px 8px;
      border: none;
      border-radius: var(--pages-radius-sm, 4px);
      background: none;
      cursor: pointer;
      text-align: left;
    }

    .picker-item:hover {
      background: var(--pages-hover-bg, #f1f3f4);
    }

    .picker-item.promoted {
      background: var(--pages-promoted-bg, rgba(52, 168, 83, 0.04));
    }

    .picker-item.needs-prereq {
      opacity: 0.6;
    }

    .item-label {
      font-weight: 500;
    }

    .item-type {
      font-size: 11px;
      color: var(--pages-text-secondary, #5f6368);
    }

    .item-hint {
      font-size: 10px;
      color: var(--pages-warning-color, #ea8600);
    }

    .picker-empty {
      text-align: center;
      padding: 16px;
      color: var(--pages-text-secondary, #5f6368);
    }
  `;
}
