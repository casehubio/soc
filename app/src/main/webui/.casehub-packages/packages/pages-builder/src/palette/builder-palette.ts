import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RovingTabindexMixin, type RovingDirection } from '@casehubio/pages-primitives/a11y';
import { type ComponentCatalogEntry, type FilteredCatalogEntry } from '../catalog/component-catalog.js';
import type { PaletteContext } from '../catalog/palette-context.js';
import { filterCatalog, getCatalogCategories } from './palette-filter.js';

@customElement('pages-builder-palette')
export class PagesBuilderPalette extends RovingTabindexMixin(LitElement) {
  override rovingSelector = '.palette-tile';
  override rovingDirection: RovingDirection = 'both';

  @property({ attribute: false }) context: PaletteContext | undefined;

  @state() private _search = '';
  @state() private _activeCategory: string | undefined;

  private _categories: readonly string[] = [];
  private _filtered: readonly FilteredCatalogEntry[] = [];

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('context') || changed.has('_search') || changed.has('_activeCategory')) {
      this._recompute();
    }
  }

  private _recompute(): void {
    const ctx = this.context ?? {
      parentType: undefined,
      acceptsComponents: true,
      availableDatasets: [],
      siblingTypes: [],
    };

    this._filtered = filterCatalog(ctx, {
      ...(this._search ? { search: this._search } : {}),
      ...(this._activeCategory ? { category: this._activeCategory } : {}),
    });
    this._categories = getCatalogCategories();
  }

  private _handleSearch(e: InputEvent): void {
    this._search = (e.target as HTMLInputElement).value;
  }

  private _handleCategoryClick(category: string): void {
    this._activeCategory = this._activeCategory === category ? undefined : category;
  }

  private _handleSelect(entry: ComponentCatalogEntry): void {
    this.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: entry,
    }));
  }

  private _renderTile(item: FilteredCatalogEntry): TemplateResult {
    const { entry, relevance } = item;
    return html`
      <button
        class="palette-tile ${relevance}"
        tabindex="-1"
        title="${entry.description}"
        @click="${() => this._handleSelect(entry)}"
      >
        <span class="tile-label">${entry.label}</span>
        <span class="tile-type">${entry.type}</span>
        ${relevance === 'needs-prereq' && entry.prereqHint ? html`
          <span class="tile-hint">${entry.prereqHint}</span>
        ` : nothing}
      </button>
    `;
  }

  override render(): TemplateResult {
    return html`
      <div class="palette-header">
        <input
          class="palette-search"
          type="text"
          placeholder="Search components..."
          .value="${this._search}"
          @input="${this._handleSearch}"
          aria-label="Search components"
        />
      </div>

      <div class="palette-categories" role="tablist" aria-label="Component categories">
        <button
          role="tab"
          class="category-tab${this._activeCategory === undefined ? ' active' : ''}"
          aria-selected="${this._activeCategory === undefined}"
          @click="${() => { this._activeCategory = undefined; }}"
        >All</button>
        ${this._categories.map(cat => html`
          <button
            role="tab"
            class="category-tab${this._activeCategory === cat ? ' active' : ''}"
            aria-selected="${this._activeCategory === cat}"
            @click="${() => this._handleCategoryClick(cat)}"
          >${cat}</button>
        `)}
      </div>

      <div class="palette-grid" role="listbox" aria-label="Available components">
        ${this._filtered.length > 0
          ? this._filtered.map(item => this._renderTile(item))
          : html`<div class="palette-empty">No components match your search.</div>`
        }
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--pages-font-family, sans-serif);
      font-size: var(--pages-font-size, 14px);
    }

    .palette-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--pages-border-color, #dadce0);
    }

    .palette-search {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: 8px;
      font-size: inherit;
      outline: none;
      background: var(--pages-input-bg, #f8f9fa);
    }

    .palette-search:focus {
      border-color: var(--pages-focus-ring, #4285f4);
      box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
    }

    .palette-categories {
      display: flex;
      gap: 4px;
      padding: 8px 16px;
      overflow-x: auto;
      border-bottom: 1px solid var(--pages-border-color, #dadce0);
    }

    .category-tab {
      padding: 4px 12px;
      border: none;
      border-radius: 16px;
      background: var(--pages-chip-bg, #f1f3f4);
      color: var(--pages-text-secondary, #5f6368);
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
    }

    .category-tab:hover {
      background: var(--pages-chip-hover-bg, #e8eaed);
    }

    .category-tab.active {
      background: var(--pages-primary, #1967d2);
      color: #fff;
    }

    .palette-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }

    .palette-tile {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px;
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: 8px;
      background: var(--pages-surface-bg, #fff);
      cursor: pointer;
      text-align: left;
      outline: none;
      transition: border-color 0.1s, box-shadow 0.1s;
    }

    .palette-tile:hover {
      border-color: var(--pages-primary, #1967d2);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .palette-tile:focus-visible {
      outline: 2px solid var(--pages-focus-ring, #4285f4);
      outline-offset: -2px;
    }

    .palette-tile.promoted {
      border-color: var(--pages-promoted-border, #34a853);
      background: var(--pages-promoted-bg, rgba(52, 168, 83, 0.04));
    }

    .palette-tile.needs-prereq {
      opacity: 0.6;
      border-style: dashed;
    }

    .tile-label {
      font-weight: 500;
      font-size: 13px;
    }

    .tile-type {
      font-size: 11px;
      color: var(--pages-text-secondary, #5f6368);
    }

    .tile-hint {
      font-size: 10px;
      color: var(--pages-warning-color, #ea8600);
      margin-top: 4px;
    }

    .palette-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 32px;
      color: var(--pages-text-secondary, #5f6368);
    }
  `;
}
