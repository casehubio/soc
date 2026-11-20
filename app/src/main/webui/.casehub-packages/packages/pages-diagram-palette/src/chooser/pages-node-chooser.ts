import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FocusTrapMixin } from '@casehubio/pages-primitives/a11y';
import type { PaletteItem, PaletteSelectDetail, IconRenderer } from '../types.js';
import { renderStencilList } from '../internal/stencil-list-renderer.js';

export class PagesNodeChooser extends FocusTrapMixin(LitElement) {
  static override styles = css`
    :host {
      display: block;
      background: var(--pages-neutral-1, #fff);
      border: 1px solid var(--pages-neutral-4, #e5e7eb);
      border-radius: var(--pages-radius-md, 8px);
      box-shadow: var(--pages-shadow-md, 0 4px 12px rgba(0,0,0,0.1));
      padding: var(--pages-space-2, 8px);
      min-width: 200px;
      max-height: 320px;
      overflow-y: auto;
      font-family: var(--pages-font-family, system-ui, sans-serif);
    }
    .chooser-search {
      display: block; width: 100%; padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-4, #e5e7eb); border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-2, #fafafa); color: var(--pages-neutral-12, #333);
      font-size: var(--pages-font-size-base, 14px); font-family: inherit;
      margin-bottom: var(--pages-space-2, 8px); box-sizing: border-box;
    }
    .chooser-search:focus { outline: 2px solid var(--pages-accent-9, #5470c6); outline-offset: -2px; }
    .palette-item {
      display: flex; align-items: center; gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-sm, 4px); cursor: pointer;
      border: none; background: transparent; color: var(--pages-neutral-12, #333);
      font-size: var(--pages-font-size-base, 14px); width: 100%; text-align: left;
    }
    .palette-item:hover { background: var(--pages-neutral-3, #f3f4f6); }
    .palette-item:focus-visible { outline: 2px solid var(--pages-accent-9, #5470c6); outline-offset: -2px; }
    .palette-item-icon { width: 20px; height: 20px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
    .palette-item-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .palette-group { margin-bottom: var(--pages-space-1, 4px); }
    .palette-group-header {
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      font-size: 11px; font-weight: var(--pages-font-weight-semibold, 600);
      color: var(--pages-neutral-8, #9ca3af); text-transform: uppercase; letter-spacing: 0.05em;
    }
    .palette-group-items, .ungrouped-items {
      display: flex; flex-direction: column;
    }
  `;

  @property({ attribute: false }) items: readonly PaletteItem[] = [];
  @property({ type: Number }) searchThreshold = 8;
  @property({ attribute: false }) abortSignal: AbortSignal | undefined;
  @property({ attribute: false }) iconRenderer: IconRenderer | undefined;

  @state() private _searchQuery = '';

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.abortSignal) {
      this.abortSignal.addEventListener('abort', this._onAbort);
    }
    requestAnimationFrame(() => {
      document.addEventListener('pointerdown', this._onClickOutside, true);
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this._onClickOutside, true);
    this.abortSignal?.removeEventListener('abort', this._onAbort);
  }

  override render(): TemplateResult {
    const showSearch = this.items.length > this.searchThreshold;
    const listboxId = 'node-list';
    return html`
      <div role="dialog" aria-label="Choose node type" aria-modal="true"
        @keydown=${this._onKeydown}>
        ${showSearch
          ? html`<input class="chooser-search" role="searchbox"
              aria-label="Filter node types"
              aria-controls=${listboxId}
              placeholder="Search..."
              .value=${this._searchQuery}
              @input=${(e: Event) => { this._searchQuery = (e.target as HTMLInputElement).value; }}
            />`
          : nothing}
        <div role="listbox" id=${listboxId} aria-label="Node types">
          ${renderStencilList(this.items, {
            collapsible: false,
            onSelect: (item) => { this._onSelect(item); },
            searchQuery: this._searchQuery,
            itemRole: 'option',
            iconRenderer: this.iconRenderer,
          })}
        </div>
      </div>`;
  }

  private _onSelect(item: PaletteItem): void {
    this.dispatchEvent(new CustomEvent<PaletteSelectDetail>('pages-palette-select', {
      detail: { item },
      bubbles: true,
      composed: true,
    }));
    this._dismiss();
  }

  private _dismiss(): void {
    this.dispatchEvent(new CustomEvent('pages-chooser-dismiss', {
      bubbles: true,
      composed: true,
    }));
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this._dismiss();
    }
  };

  private _onClickOutside = (e: PointerEvent): void => {
    if (!e.composedPath().includes(this)) {
      this._dismiss();
    }
  };

  private _onAbort = (): void => {
    this._dismiss();
  };
}

if (!customElements.get('pages-node-chooser')) {
  customElements.define('pages-node-chooser', PagesNodeChooser);
}
