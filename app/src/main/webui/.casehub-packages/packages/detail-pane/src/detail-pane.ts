import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import type { TabDefinition } from './types.js';

export interface DetailPaneProps {
  tabs: TabDefinition[];
  selectionTopic: string;
  emptyMessage: string;
}

@customElement('agency-detail-pane')
export class DetailPane extends LiveRegionMixin(LitElement) {
  @property({ type: Array }) tabs: TabDefinition[] = [];
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = '';
  @property({ type: String, attribute: 'empty-message' }) emptyMessage = 'Select an item to view details';
  @property({ type: Boolean }) standalone = false;

  @state() private _item: unknown = null;
  @state() private _activeTabId = '';

  configure(props: Partial<DetailPaneProps>): void {
    if (props.tabs !== undefined) this.tabs = props.tabs as TabDefinition[];
    if (props.selectionTopic !== undefined) this.selectionTopic = props.selectionTopic;
    if (props.emptyMessage !== undefined) this.emptyMessage = props.emptyMessage;
  }

  private _tabElements = new Map<string, HTMLElement>();
  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-7, #525252);
      font-size: var(--pages-font-size-sm, 12px);
    }

    .tab-bar {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4);
      background: var(--pages-neutral-2, #f5f5f5);
      overflow-x: auto;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      cursor: pointer;
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-7, #525252);
      white-space: nowrap;
    }

    .tab-button[aria-selected="true"] {
      color: var(--pages-accent-9, #3b82f6);
      border-bottom-color: var(--pages-accent-9, #3b82f6);
      font-weight: 600;
    }

    .tab-button:hover {
      background: var(--pages-neutral-3, #e5e5e5);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9px;
      background: var(--pages-neutral-5, #a3a3a3);
      color: var(--pages-neutral-1, #fafafa);
      font-size: 10px;
      font-weight: 600;
    }

    .tab-panel {
      flex: 1;
      overflow: auto;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('tabindex', '-1');
    if (this.standalone) {
      this._item = {};
      const sorted = this._sortedTabs;
      if (!this._activeTabId && sorted.length > 0) {
        this._activeTabId = sorted[0]!.id;
      }
    }
    if (this.selectionTopic) {
      this._unsubs.push(
        onPagesEvent(document, `${this.selectionTopic}:selected`, (payload: unknown) => {
          this._item = payload;
          const sorted = this._sortedTabs;
          if (!this._activeTabId && sorted.length > 0) {
            this._activeTabId = sorted[0]!.id;
          }
          this.announce(`${this._activeTab?.label ?? ''} tab`);
        }),
        onPagesEvent(document, `${this.selectionTopic}:deselected`, () => {
          this._item = null;
        }),
      );
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }

  private get _sortedTabs(): TabDefinition[] {
    return [...this.tabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private get _activeTab(): TabDefinition | undefined {
    return this._sortedTabs.find(t => t.id === this._activeTabId);
  }

  private _getOrCreateTabElement(tab: TabDefinition): HTMLElement {
    let el = this._tabElements.get(tab.id);
    if (!el) {
      el = document.createElement(tab.tagName);
      this._tabElements.set(tab.id, el);
    }
    (el as any).item = this._item;
    return el;
  }

  private _handleTabClick(tabId: string): void {
    this._activeTabId = tabId;
  }

  private _handleTabKeyDown = (e: KeyboardEvent): void => {
    const sorted = this._sortedTabs;
    const currentIdx = sorted.findIndex(t => t.id === this._activeTabId);
    let nextIdx = currentIdx;

    if (e.key === 'ArrowRight') {
      nextIdx = (currentIdx + 1) % sorted.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (currentIdx - 1 + sorted.length) % sorted.length;
    } else {
      return;
    }

    e.preventDefault();
    const next = sorted[nextIdx];
    if (!next) return;
    this._activeTabId = next.id;
    const tabButtons = this.shadowRoot?.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
    tabButtons[nextIdx]?.focus();
  };

  override focus(): void {
    if (this._item) {
      const panel = this.shadowRoot?.querySelector('[role="tabpanel"]') as HTMLElement | undefined;
      panel?.focus();
    }
  }

  override render() {
    if (!this._item && !this.standalone) {
      return html`<div class="empty" role="status">${this.emptyMessage}</div>`;
    }

    const sorted = this._sortedTabs;
    const activeTab = this._activeTab;
    const activeContent = activeTab?.renderContent
      ? activeTab.renderContent(this._item)
      : (activeTab ? this._getOrCreateTabElement(activeTab) : null);

    return html`
      <div class="tab-bar" role="tablist" @keydown=${this._handleTabKeyDown}>
        ${sorted.map(tab => {
          const isActive = tab.id === this._activeTabId;
          const badgeValue = tab.badge?.(this._item);
          return html`
            <button class="tab-button"
                    role="tab"
                    aria-selected="${isActive}"
                    aria-controls="panel-${tab.id}"
                    tabindex="${isActive ? 0 : -1}"
                    @click=${() => this._handleTabClick(tab.id)}>
              ${tab.label}
              ${badgeValue ? html`<span class="badge">${badgeValue}</span>` : nothing}
            </button>
          `;
        })}
      </div>
      <div class="tab-panel"
           role="tabpanel"
           id="panel-${this._activeTabId}"
           aria-labelledby="tab-${this._activeTabId}"
           tabindex="0">
        ${activeContent}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-detail-pane': DetailPane;
  }
}
