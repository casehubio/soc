import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { onPagesEvent, emitPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';

export class PagesSplitWorkbench extends LiveRegionMixin(LitElement) {
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = '';
  @property({ type: String }) override title = '';
  @property({ type: String, attribute: 'storage-key' })
  get storageKey(): string {
    return this._storageKey ?? `split-workbench-${this.selectionTopic}-divider`;
  }
  set storageKey(v: string) { this._storageKey = v; }
  private _storageKey?: string;

  @state() private _hasSelection = false;
  @state() private _dividerRatio = 0.5;
  @state() private _isDragging = false;

  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      font-family: var(--pages-font-family, system-ui);
      overflow: hidden;
      container-type: inline-size;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .header {
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4);
      background: var(--pages-neutral-1, #fafafa);
    }

    .header h2 {
      margin: 0;
      font-size: var(--pages-font-size-lg, 16px);
      font-weight: 600;
      color: var(--pages-neutral-11, #0a0a0a);
    }

    .split-pane {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .list-panel {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      overflow: hidden;
    }

    .divider {
      width: 4px;
      background: var(--pages-neutral-3, #e5e5e5);
      cursor: col-resize;
      flex-shrink: 0;
    }

    .divider:hover, .divider:focus-visible, .divider.dragging {
      background: var(--pages-accent-9, #3b82f6);
      outline: none;
    }

    .detail-panel {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .back-button {
      display: none;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      background: none;
      border: none;
      border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4);
      cursor: pointer;
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-accent-9, #3b82f6);
      width: 100%;
    }

    @container (max-width: 768px) {
      .divider { display: none; }

      .list-panel {
        width: 100% !important;
        min-width: unset !important;
        max-width: unset !important;
      }

      :host(:not([has-selection])) .detail-panel { display: none; }
      :host([has-selection]) .list-panel { display: none; }
      :host([has-selection]) .detail-panel { flex: 1; }
      :host([has-selection]) .back-button { display: flex; }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.selectionTopic) {
      console.warn('[split-workbench] selection-topic is required but not set.');
    }
    this._restoreDivider();
    this._subscribeEvents();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => { u(); });
    this._unsubs = [];
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (changed.has('_hasSelection')) {
      if (this._hasSelection) {
        this.setAttribute('has-selection', '');
        this.announce('Showing detail');
        this._focusSlot('detail');
      } else if (changed.get('_hasSelection') !== undefined) {
        this.removeAttribute('has-selection');
        this.announce('Showing list');
        this._focusSlot('list');
      }
    }
  }

  private _focusSlot(name: string): void {
    const slot = this.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null;
    const child = slot?.assignedElements()[0] as HTMLElement | undefined;
    child?.focus();
  }

  private _restoreDivider(): void {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const ratio = parseFloat(saved);
      if (ratio >= 0.2 && ratio <= 0.7) this._dividerRatio = ratio;
    }
  }

  private _subscribeEvents(): void {
    if (!this.selectionTopic) return;
    this._unsubs.push(
      onPagesEvent(document, `${this.selectionTopic}:selected`, () => {
        this._hasSelection = true;
      }),
      onPagesEvent(document, `${this.selectionTopic}:deselected`, () => {
        this._hasSelection = false;
      }),
    );
  }

  private _handleDividerMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this._isDragging = true;
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
  };

  private _handleMouseMove = (e: MouseEvent): void => {
    const pane = this.shadowRoot?.querySelector('.split-pane') as HTMLElement | null;
    if (!pane) return;
    const rect = pane.getBoundingClientRect();
    const ratio = Math.max(0.2, Math.min(0.7, (e.clientX - rect.left) / rect.width));
    this._dividerRatio = ratio;
  };

  private _handleMouseUp = (): void => {
    this._isDragging = false;
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, this._dividerRatio.toString());
    }
  };

  private _handleDividerKeyDown = (e: KeyboardEvent): void => {
    const step = 0.05;
    if (e.key === 'ArrowRight') {
      this._dividerRatio = Math.min(0.7, this._dividerRatio + step);
    } else if (e.key === 'ArrowLeft') {
      this._dividerRatio = Math.max(0.2, this._dividerRatio - step);
    } else {
      return;
    }
    e.preventDefault();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, this._dividerRatio.toString());
    }
  };

  private _handleBack = (): void => {
    this._hasSelection = false;
    if (this.selectionTopic) {
      emitPagesEvent(document, `${this.selectionTopic}:deselected`, {});
    }
  };

  override render() {
    const dividerPercent = Math.round(this._dividerRatio * 100);
    return html`
      <div class="wrapper">
        <div class="header">
          <slot name="header">
            ${this.title ? html`<h2>${this.title}</h2>` : nothing}
          </slot>
        </div>

        <div class="split-pane">
          <div class="list-panel" role="region" aria-label="List"
               style="width: ${dividerPercent}%; min-width: 320px; max-width: 70%">
            <slot name="list"></slot>
          </div>

          <div class="divider ${this._isDragging ? 'dragging' : ''}"
               role="separator"
               aria-orientation="vertical"
               aria-valuenow="${dividerPercent}"
               aria-valuemin="20"
               aria-valuemax="70"
               tabindex="0"
               @mousedown=${this._handleDividerMouseDown}
               @keydown=${this._handleDividerKeyDown}></div>

          <div class="detail-panel" role="region" aria-label="Detail">
            <button class="back-button"
                    aria-label="Back to list"
                    @click=${this._handleBack}>
              ← Back to list
            </button>
            <slot name="detail"></slot>
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('pages-split-workbench')) {
  customElements.define('pages-split-workbench', PagesSplitWorkbench);
}

declare global {
  interface HTMLElementTagNameMap {
    'pages-split-workbench': PagesSplitWorkbench;
  }
}
