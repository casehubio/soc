import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WorkItemResponse, WorkItemStatus, WorkItemPriority } from '@casehubio/mosaic-core';

const STATUS_LABELS: Record<WorkItemStatus, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  FAULTED: 'Faulted',
  DELEGATED: 'Delegated',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  ESCALATED: 'Escalated',
  OBSOLETE: 'Obsolete',
};

const STATUS_COLORS: Record<WorkItemStatus, string> = {
  PENDING: '#9399b2',
  ASSIGNED: '#89b4fa',
  IN_PROGRESS: '#a6e3a1',
  COMPLETED: '#6c7086',
  REJECTED: '#f38ba8',
  FAULTED: '#f38ba8',
  DELEGATED: '#cba6f7',
  SUSPENDED: '#f9e2af',
  CANCELLED: '#6c7086',
  EXPIRED: '#f38ba8',
  ESCALATED: '#fab387',
  OBSOLETE: '#6c7086',
};

const PRIORITY_COLORS: Record<WorkItemPriority, string> = {
  URGENT: '#f38ba8',
  HIGH: '#fab387',
  MEDIUM: '#89b4fa',
  LOW: '#9399b2',
};

@customElement('human-work-item-card')
export class HumanWorkItemCard extends LitElement {
  @property({ attribute: false }) item!: WorkItemResponse;

  static override styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(148, 226, 213, 0.06);
      border: 1px solid rgba(148, 226, 213, 0.2);
      border-left: 3px solid #94e2d5;
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.15s;
      outline: none;
    }
    .card:hover {
      background: rgba(148, 226, 213, 0.10);
    }
    .card:focus-visible {
      box-shadow: 0 0 0 2px #94e2d5;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .icon {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: rgba(148, 226, 213, 0.15);
      color: #94e2d5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .title {
      font-size: 12px;
      font-weight: 500;
      color: #cdd6f4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .priority-badge {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      flex-shrink: 0;
    }
    .assignee {
      font-size: 11px;
      color: #a6adc8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .status-pill {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      flex-shrink: 0;
    }
    .sla-row {
      padding-left: 32px;
    }
    .progress-bar {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      margin-top: 2px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 2px;
      background: #94e2d5;
      transition: width 0.3s;
    }
    :host([data-sla-breached]) .card {
      border-left-color: #f38ba8;
      animation: breach-pulse 2s ease-in-out infinite;
    }
    @keyframes breach-pulse {
      0%, 100% { border-left-color: #f38ba8; }
      50% { border-left-color: #eba0ac; }
    }
    @media (prefers-reduced-motion: reduce) {
      .card, .progress-fill { transition: none; }
      :host([data-sla-breached]) .card { animation: none; }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'article');
    this._updateAriaLabel();
    this.addEventListener('sla.state-changed', this._onSlaStateChanged as EventListener);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('sla.state-changed', this._onSlaStateChanged as EventListener);
  }

  override updated(): void {
    this._updateAriaLabel();
  }

  private _updateAriaLabel(): void {
    if (!this.item) return;
    const label = STATUS_LABELS[this.item.status] ?? this.item.status;
    this.setAttribute('aria-label',
      `Work item: ${this.item.title}, ${label}, priority ${this.item.priority}`);
  }

  private _onSlaStateChanged = (e: CustomEvent<{ state: string }>): void => {
    this.toggleAttribute('data-sla-breached', e.detail.state === 'breached');
  };

  private _onSelect(): void {
    this.dispatchEvent(new CustomEvent('work-item:select', {
      detail: { workItemId: this.item.id },
      bubbles: true,
      composed: true,
    }));
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onSelect();
    }
  }

  override render() {
    if (!this.item) return nothing;
    const i = this.item;
    const deadline = i.expiresAt ?? i.claimDeadline;
    const statusColor = STATUS_COLORS[i.status] ?? '#9399b2';
    const priorityColor = PRIORITY_COLORS[i.priority] ?? '#9399b2';

    return html`
      <div class="card" tabindex="0" role="button"
           @click=${this._onSelect}
           @keydown=${this._onKeydown}>
        <div class="row">
          <div class="icon">👤</div>
          <span class="title">${i.title}</span>
          <span class="priority-badge ${i.priority.toLowerCase()}"
                style="background:${priorityColor}20;color:${priorityColor}">
            ${i.priority}
          </span>
        </div>
        <div class="row">
          <span class="assignee">
            ${i.assigneeId ? `👤 ${i.assigneeId}` : 'Unassigned'}
          </span>
          <span class="status-pill"
                style="background:${statusColor}20;color:${statusColor}">
            ${STATUS_LABELS[i.status] ?? i.status}
          </span>
        </div>
        ${deadline ? html`
          <div class="sla-row" aria-live="polite">
            <agency-sla-indicator
              deadline=${deadline}
              compact
            ></agency-sla-indicator>
          </div>
        ` : nothing}
        ${i.percentComplete != null ? html`
          <div class="progress-bar">
            <div class="progress-fill" style="width:${i.percentComplete}%"></div>
          </div>
        ` : nothing}
      </div>
    `;
  }
}
