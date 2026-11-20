import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WorkItemResponse } from '@casehubio/mosaic-core';
import { emitPagesEvent } from '@casehubio/pages-data';

interface WorkItemRelation {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly direction: 'outgoing' | 'incoming';
  readonly createdBy: string;
  readonly createdAt: string;
  readonly title?: string;
  readonly status?: string;
}

// Legacy type for backwards compatibility (can be removed if not used elsewhere)
interface RelatedItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly relationType: 'parent' | 'child' | 'linked';
}

@customElement('agency-detail-relations-tab')
export class DetailRelationsTab extends LitElement {
  @property({ type: Object }) workItem: WorkItemResponse | null = null;
  @property({ type: Array }) relations: readonly WorkItemRelation[] = [];
  @property({ type: Array }) relatedItems: readonly RelatedItem[] = [];

  static override styles = css`
    :host {
      display: block;
      padding: var(--pages-space-4, 16px);
    }

    .section {
      margin-bottom: var(--pages-space-4, 16px);
    }

    .section-title {
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      margin: 0 0 var(--pages-space-2, 8px) 0;
      color: var(--pages-neutral-12, #111);
    }

    .relation-list {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-2, 8px);
    }

    .relation-item {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-2, #fafafa);
      cursor: pointer;
    }

    @media (prefers-reduced-motion: no-preference) {
      .relation-item {
        transition: background-color 120ms ease-out;
      }
    }

    .relation-item:hover {
      background: var(--pages-neutral-3, #f3f3f3);
    }

    .relation-item:focus-visible {
      outline: 2px solid var(--pages-accent-9, #2563eb);
      outline-offset: 2px;
    }

    .relation-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--pages-accent-9, #2563eb);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-semibold, 600);
      flex-shrink: 0;
    }

    .relation-content {
      flex: 1;
      min-width: 0;
    }

    .relation-title {
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-12, #111);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .relation-meta {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-9, #888);
    }

    .status-pill {
      padding: 2px 6px;
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-medium, 500);
      background: var(--pages-neutral-3, #f3f3f3);
      color: var(--pages-neutral-11, #444);
      flex-shrink: 0;
    }

    .empty {
      text-align: center;
      padding: var(--pages-space-4, 16px);
      color: var(--pages-neutral-9, #888);
      font-size: var(--pages-font-size-sm, 12px);
    }
  `;

  override render(): TemplateResult {
    if (!this.workItem) {
      return html`<div class="empty">No work item selected</div>`;
    }

    // Group relations by type
    const byType = new Map<string, WorkItemRelation[]>();
    for (const rel of this.relations) {
      const list = byType.get(rel.relationType) ?? [];
      list.push(rel);
      byType.set(rel.relationType, list);
    }

    const sections = Array.from(byType.entries()).map(([type, rels]) => ({
      title: this._formatRelationType(type),
      relations: rels,
    }));

    return html`
      ${sections.map(
        section => html`
          <div class="section">
            <h3 class="section-title">${section.title}</h3>
            <div class="relation-list">
              ${section.relations.map(rel => this._renderRelation(rel))}
            </div>
          </div>
        `
      )}
      ${this.relations.length === 0
        ? html`<div class="empty">No related work items</div>`
        : ''}
    `;
  }

  private _renderRelation(rel: WorkItemRelation): TemplateResult {
    const relatedItemId = rel.direction === 'outgoing' ? rel.targetId : rel.sourceId;
    const title = rel.title ?? relatedItemId;
    const status = rel.status ?? 'Unknown';

    return html`
      <div
        class="relation-item"
        role="button"
        tabindex="0"
        @click="${() => this._handleItemClick(relatedItemId)}"
        @keydown="${(e: KeyboardEvent) => this._handleItemKeydown(e, relatedItemId)}"
      >
        <div class="relation-icon">${this._getRelationIcon(rel.relationType)}</div>
        <div class="relation-content">
          <div class="relation-title">${title}</div>
          <div class="relation-meta">${relatedItemId}</div>
        </div>
        <div class="status-pill">${status}</div>
      </div>
    `;
  }

  private _renderRelationItem(item: RelatedItem): TemplateResult {
    return html`
      <div
        class="relation-item"
        role="button"
        tabindex="0"
        @click="${() => this._handleItemClick(item.id)}"
        @keydown="${(e: KeyboardEvent) => this._handleItemKeydown(e, item.id)}"
      >
        <div class="relation-icon">${this._getRelationIcon(item.relationType)}</div>
        <div class="relation-content">
          <div class="relation-title">${item.title}</div>
          <div class="relation-meta">${item.id}</div>
        </div>
        <div class="status-pill">${item.status}</div>
      </div>
    `;
  }

  private _formatRelationType(type: string): string {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private _getRelationIcon(type: string): string {
    // Map specific types to icons
    if (type === 'PART_OF' || type === 'HAS_PART') return '⊂';
    if (type === 'BLOCKS' || type === 'BLOCKED_BY') return '⊗';
    if (type === 'RELATES_TO') return '→';
    // Legacy types
    if (type === 'parent') return '↑';
    if (type === 'child') return '↓';
    if (type === 'linked') return '→';
    return '→'; // default
  }

  private _handleItemClick(workItemId: string): void {
    emitPagesEvent(document, 'work-item.selected', { workItemId });
  }

  private _handleItemKeydown(e: KeyboardEvent, workItemId: string): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleItemClick(workItemId);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-detail-relations-tab': DetailRelationsTab;
  }
}
