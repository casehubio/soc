import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { NavigationController } from './navigation-controller.js';
import './entity-list.js';
import './entity-detail.js';
import './entity-tree.js';
import '@casehubio/pages-ui-components/split-workbench';
import type { EntityTypeRegistration, EntityTreeNode, EntitySelection, NavigationState } from './types.js';

export interface CaseExplorerProps {
  entityTypes: readonly EntityTypeRegistration[];
}

@customElement('agency-case-explorer')
export class CaseExplorer extends LiveRegionMixin(LitElement) {
  @property({ attribute: false }) entityTypes: readonly EntityTypeRegistration[] = [];
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  _nav: NavigationController | undefined;
  private _selectionTopic = 'case-explorer';

  @state() _treeNodes: EntityTreeNode[] = [];
  @state() private _treeLoading = false;
  private _treeRootId: string | null = null;
  private _lastTreeFetchId: string | null = null;
  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host { display: block; height: 100%; }

    .explorer { display: flex; flex-direction: column; height: 100%; }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--pages-neutral-5, #ccc);
      flex-wrap: wrap;
    }

    .tabs {
      display: flex;
      gap: 2px;
    }

    .tabs button {
      padding: 6px 14px;
      border: 1px solid var(--pages-neutral-5, #ccc);
      background: var(--pages-neutral-3, #fff);
      cursor: pointer;
      font-size: 0.8125rem;
      border-radius: 4px;
    }

    .tabs button[aria-selected="true"] {
      background: var(--pages-accent-9, #0066cc);
      color: #fff;
      border-color: var(--pages-accent-9, #0066cc);
    }

    .tabs button:hover:not([aria-selected="true"]) {
      background: var(--pages-neutral-4, #f0f0f0);
    }

    .view-toggle {
      display: flex;
      gap: 2px;
      margin-left: auto;
    }

    .view-toggle button {
      padding: 4px 10px;
      border: 1px solid var(--pages-neutral-5, #ccc);
      background: var(--pages-neutral-3, #fff);
      cursor: pointer;
      font-size: 0.75rem;
      border-radius: 3px;
    }

    .view-toggle button[aria-checked="true"] {
      background: var(--pages-accent-9, #0066cc);
      color: #fff;
      border-color: var(--pages-accent-9, #0066cc);
    }

    .breadcrumbs {
      display: flex;
      gap: 4px;
      padding: 4px 12px;
      font-size: 0.8125rem;
      color: var(--pages-neutral-9, #999);
      border-bottom: 1px solid var(--pages-neutral-5, #eee);
    }

    .breadcrumbs button {
      border: none;
      background: none;
      cursor: pointer;
      color: var(--pages-accent-9, #0066cc);
      font-size: 0.8125rem;
      padding: 0;
    }

    .breadcrumbs button:hover { text-decoration: underline; }
    .breadcrumb-separator { color: var(--pages-neutral-9, #ccc); }

    .content { flex: 1; overflow: hidden; }

    .tree-prompt {
      display: flex; align-items: center; justify-content: center;
      height: 100%; padding: 32px;
      color: var(--pages-neutral-9, #999); font-size: 0.875rem; text-align: center;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this._nav = new NavigationController(this, this.entityTypes);
    this._unsubs.push(
      onPagesEvent(document, `${this._selectionTopic}:selected`, (payload: unknown) => {
        const sel = payload as EntitySelection;
        this._nav?.selectEntity(sel);
      }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }

  override render(): TemplateResult {
    if (!this._nav || this.entityTypes.length === 0) {
      return html`<div>No entity types registered</div>`;
    }

    const navState = this._nav.state;
    const currentReg = this._nav.getRegistration(navState.currentEntityType);

    return html`
      <div class="explorer">
        ${this._renderToolbar(navState)}
        ${navState.breadcrumbs.length > 0 ? this._renderBreadcrumbs(navState) : nothing}
        <div class="content">
          <pages-split-workbench selection-topic=${this._selectionTopic}>
            <div slot="list">
              ${navState.viewMode === 'list' && currentReg
                ? html`<agency-entity-list .registration=${currentReg} .fetchFn=${this.fetchFn} selection-topic=${this._selectionTopic}></agency-entity-list>`
                : nothing}
              ${navState.viewMode === 'tree'
                ? this._renderTreePanel(navState)
                : nothing}
            </div>
            <div slot="detail">
              <agency-entity-detail .registration=${currentReg} .fetchFn=${this.fetchFn} selection-topic=${this._selectionTopic}></agency-entity-detail>
            </div>
          </pages-split-workbench>
        </div>
      </div>
    `;
  }

  private _renderToolbar(navState: Readonly<NavigationState>): TemplateResult {
    return html`
      <div class="toolbar">
        <div class="tabs" role="tablist" aria-label="Entity types">
          ${this.entityTypes.map(et => html`
            <button
              role="tab"
              aria-selected=${et.type === navState.currentEntityType ? 'true' : 'false'}
              @click=${() => this._nav!.selectEntityType(et.type)}
            >${et.label}</button>
          `)}
        </div>
        <div class="view-toggle" role="radiogroup" aria-label="View mode">
          <button
            role="radio"
            aria-checked=${navState.viewMode === 'list' ? 'true' : 'false'}
            @click=${() => this._nav!.setViewMode('list')}
          >List</button>
          <button
            role="radio"
            aria-checked=${navState.viewMode === 'tree' ? 'true' : 'false'}
            @click=${() => this._nav!.setViewMode('tree')}
          >Tree</button>
        </div>
      </div>
    `;
  }

  private _renderBreadcrumbs(navState: Readonly<NavigationState>): TemplateResult {
    return html`
      <div class="breadcrumbs" aria-label="Navigation breadcrumbs">
        ${navState.breadcrumbs.map((bc: { label: string }, i: number) => html`
          <button @click=${() => this._nav!.navigateBack(i)}>${bc.label}</button>
          <span class="breadcrumb-separator">›</span>
        `)}
        <span>${this._nav!.getRegistration(navState.currentEntityType)?.label ?? navState.currentEntityType}</span>
      </div>
    `;
  }

  override updated(): void {
    if (!this._nav) return;
    const navState = this._nav.state;
    if (navState.viewMode === 'tree' && navState.selectedEntityId) {
      if (this._treeRootId === null) {
        this._treeRootId = navState.selectedEntityId;
      }
      if (this._lastTreeFetchId !== this._treeRootId) {
        this._fetchTreeData(this._treeRootId);
      }
    }
    if (navState.viewMode === 'list') {
      this._treeRootId = null;
      this._lastTreeFetchId = null;
      if (this._treeNodes.length > 0) {
        this._treeNodes = [];
      }
    }
  }

  private _renderTreePanel(navState: Readonly<NavigationState>): TemplateResult {
    if (!navState.selectedEntityId) {
      return html`<div class="tree-prompt">Select an entity in list mode first, then switch to tree view to explore its hierarchy.</div>`;
    }

    if (this._treeLoading || this._treeNodes.length === 0) {
      return html`<div class="tree-prompt">Loading hierarchy...</div>`;
    }

    return html`<agency-entity-tree .nodes=${this._treeNodes} selection-topic=${this._selectionTopic} .fetchFn=${this.fetchFn}></agency-entity-tree>`;
  }

  private async _fetchTreeData(rootId: string): Promise<void> {
    const reg = this._nav?.getRegistration(this._nav.state.currentEntityType);
    if (!reg?.treeEndpoint) return;

    this._treeLoading = true;
    this._lastTreeFetchId = rootId;

    try {
      const url = reg.treeEndpoint(rootId);
      const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).toString();
      const response = await this.fetchFn(fullUrl, { headers: { 'Accept': 'application/json' } });

      if (!response.ok) {
        this._treeNodes = [];
        return;
      }

      this._treeNodes = await response.json();
    } catch {
      this._treeNodes = [];
    } finally {
      this._treeLoading = false;
    }
  }
}
