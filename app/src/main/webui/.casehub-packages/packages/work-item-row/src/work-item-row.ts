import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WorkItemResponse } from '@casehubio/mosaic-core';
import { formatTimestamp } from '@casehubio/mosaic-core';

export interface WorkItemRowProps {
  item: WorkItemResponse;
}

@customElement('agency-work-item-row')
export class WorkItemRow extends LitElement {
  @property({ type: Object }) item!: WorkItemResponse;

  static override styles = css`
    :host { display: block; cursor: pointer; }
    .row {
      display: grid;
      grid-template-columns: 1fr 105px 140px 40px;
      align-items: center;
      gap: var(--pages-space-3, 12px);
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      border-left: 3px solid transparent;
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
      transition: background var(--pages-duration-fast, 120ms) var(--pages-ease-out);
    }
    .row:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .row.selected { background: var(--pages-accent-3, #e0e7ff); }
    .row.priority-urgent { border-left-color: var(--pages-danger-9, #dc2626); }
    .row.priority-high { border-left-color: var(--pages-warning-9, #d97706); }
    .row.priority-medium { border-left-color: var(--pages-accent-9, #2563eb); }
    .row.priority-low { border-left-color: var(--pages-neutral-7, #a3a3a3); }
    .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pages-neutral-12, #111); font-size: var(--pages-font-size-base, 14px); min-width: 0; }
    .status-pill {
      font-size: var(--pages-font-size-xs, 11px);
      padding: 1px var(--pages-space-1-5, 6px);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-neutral-11, #666);
      font-weight: var(--pages-font-weight-medium, 500);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      min-width: 90px;
      text-align: center;
    }
    .category { font-size: var(--pages-font-size-sm, 12px); color: var(--pages-neutral-9, #888); min-width: 80px; text-align: right; }
    .age { font-size: var(--pages-font-size-sm, 12px); color: var(--pages-neutral-9, #888); min-width: 30px; text-align: right; }

    @media (prefers-reduced-motion: reduce) {
      .row { transition: none; }
    }
  `;

  override render() {
    const priorityClass = `priority-${this.item.priority.toLowerCase()}`;
    return html`
      <div class="row ${priorityClass}" role="option" tabindex="-1" @click=${this._handleClick}>
        <span class="title" title="${this.item.title}">${this.item.title}</span>
        <span class="status-pill">${this.item.status}</span>
        <span class="category">${this.item.category ?? ''}</span>
        <span class="age">${formatTimestamp(this.item.createdAt, { style: 'compact' })}</span>
      </div>
    `;
  }

  private _handleClick(): void {
    this.dispatchEvent(new CustomEvent('row-select', {
      bubbles: true, composed: true,
      detail: { workItemId: this.item.id },
    }));
  }
}
