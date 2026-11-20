import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import type { EntityTreeNode, EntitySelection } from './types.js';

export const EntityTreeTopics = {
  NODE_SELECTED: 'tree.node-selected',
} as const;

export interface EntityTreeProps {
  selectionTopic: string;
}

@customElement('agency-entity-tree')
export class EntityTree extends LiveRegionMixin(LitElement) {
  @property({ attribute: false }) nodes: readonly EntityTreeNode[] = [];
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = '';
  @property({ attribute: false }) nodeRenderer: ((node: EntityTreeNode) => HTMLElement) | undefined;
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  @state() private _expandedIds = new Set<string>();
  @state() private _selectedId: string | null = null;
  @state() private _lazyChildren = new Map<string, readonly EntityTreeNode[]>();
  @state() private _loadingIds = new Set<string>();

  static override styles = css`
    :host { display: block; }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    ul ul { padding-left: 20px; }

    li {
      margin: 0;
    }

    .node {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .node:hover { background: var(--pages-neutral-4, #f0f0f0); }

    .node.selected {
      background: var(--pages-selection-color, #e3f2fd);
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      font-size: 0.625rem;
      color: var(--pages-neutral-9, #999);
    }

    .toggle-spacer { width: 16px; display: inline-block; }

    .label { flex: 1; }

    .status-badge {
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.6875rem;
      background: var(--pages-neutral-3, #f0f0f0);
      color: var(--pages-neutral-9, #666);
    }

    .group-info {
      font-size: 0.75rem;
      color: var(--pages-neutral-9, #999);
    }

    .loading-indicator {
      padding: 4px 8px 4px 28px;
      font-size: 0.8125rem;
      color: var(--pages-neutral-9, #999);
    }
  `;

  override render(): TemplateResult {
    return html`
      <ul role="tree" aria-label="Entity hierarchy">
        ${(Array.isArray(this.nodes) ? this.nodes : []).map(node => this._renderNode(node, 0))}
      </ul>
    `;
  }

  private _renderNode(node: EntityTreeNode, depth: number): TemplateResult {
    const hasChildren = this._hasChildren(node);
    const isExpanded = this._expandedIds.has(node.id);
    const isSelected = this._selectedId === node.id;
    const isLoading = this._loadingIds.has(node.id);
    const children = this._getChildren(node);

    return html`
      <li role="treeitem"
          aria-expanded=${hasChildren ? String(isExpanded) : nothing}
          aria-selected=${String(isSelected)}
          @click=${(e: Event) => { e.stopPropagation(); this._selectNode(node); }}
          @keydown=${(e: KeyboardEvent) => this._handleKeydown(e, node)}
          tabindex=${depth === 0 ? '0' : '-1'}>
        <div class="node ${isSelected ? 'selected' : ''}">
          ${hasChildren
            ? html`<button class="toggle" @click=${(e: Event) => { e.stopPropagation(); this._toggleExpand(node); }} aria-label=${isExpanded ? 'Collapse' : 'Expand'}>${isExpanded ? '▼' : '▶'}</button>`
            : html`<span class="toggle-spacer"></span>`}
          ${this._renderNodeContent(node)}
        </div>
        ${hasChildren && isExpanded ? html`
          <ul role="group">
            ${isLoading ? html`<li class="loading-indicator">Loading...</li>` : nothing}
            ${children.map(child => this._renderNode(child, depth + 1))}
          </ul>
        ` : nothing}
      </li>
    `;
  }

  private _renderNodeContent(node: EntityTreeNode): TemplateResult {
    if (this.nodeRenderer) {
      const custom = this.nodeRenderer(node);
      return html`${custom}`;
    }

    return html`
      <span class="label">${node.label}</span>
      ${node.groupInfo ? html`
        <span class="group-info">${node.groupInfo.completedCount}/${node.groupInfo.requiredCount} of ${node.groupInfo.totalInGroup}</span>
      ` : nothing}
      <span class="status-badge">${node.status}</span>
    `;
  }

  private _hasChildren(node: EntityTreeNode): boolean {
    return (node.children !== undefined && node.children.length > 0)
      || node.childrenEndpoint !== undefined
      || (node.childCount !== undefined && node.childCount > 0)
      || this._lazyChildren.has(node.id);
  }

  private _getChildren(node: EntityTreeNode): readonly EntityTreeNode[] {
    if (this._lazyChildren.has(node.id)) {
      return this._lazyChildren.get(node.id)!;
    }
    return node.children ?? [];
  }

  private _selectNode(node: EntityTreeNode): void {
    this._selectedId = node.id;
    const selection: EntitySelection = { id: node.id, type: node.type };
    if (this.selectionTopic) {
      emitPagesEvent(document, `${this.selectionTopic}:selected`, selection);
    }
  }

  private _toggleExpand(node: EntityTreeNode): void {
    const next = new Set(this._expandedIds);
    if (next.has(node.id)) {
      next.delete(node.id);
    } else {
      next.add(node.id);
      if (node.childrenEndpoint && !this._lazyChildren.has(node.id)) {
        this._fetchChildren(node);
      }
    }
    this._expandedIds = next;
  }

  private async _fetchChildren(node: EntityTreeNode): Promise<void> {
    if (!node.childrenEndpoint) return;

    const loading = new Set(this._loadingIds);
    loading.add(node.id);
    this._loadingIds = loading;

    try {
      const url = node.childrenEndpoint.startsWith('http')
        ? node.childrenEndpoint
        : new URL(node.childrenEndpoint, window.location.origin).toString();

      const response = await this.fetchFn(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        this.announce(`Failed to load children: ${response.statusText}`);
        return;
      }

      const children: EntityTreeNode[] = await response.json();
      const next = new Map(this._lazyChildren);
      next.set(node.id, children);
      this._lazyChildren = next;
      this.announce(`Loaded ${String(children.length)} children`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.announce(`Failed to load children: ${message}`);
    } finally {
      const loading = new Set(this._loadingIds);
      loading.delete(node.id);
      this._loadingIds = loading;
    }
  }

  private _handleKeydown(e: KeyboardEvent, node: EntityTreeNode): void {
    switch (e.key) {
      case 'ArrowRight':
        if (this._hasChildren(node) && !this._expandedIds.has(node.id)) {
          this._toggleExpand(node);
          e.preventDefault();
        }
        break;
      case 'ArrowLeft':
        if (this._expandedIds.has(node.id)) {
          this._toggleExpand(node);
          e.preventDefault();
        }
        break;
      case 'Enter':
      case ' ':
        this._selectNode(node);
        e.preventDefault();
        break;
    }
  }
}
