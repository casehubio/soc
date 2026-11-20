import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QhorusMessage } from './types.js';
import { isObligationCreating, isTerminalCommitmentState } from './types.js';
import type { CommitmentState } from './types.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import type { CommitmentRecord } from './commitment.js';
import '@casehubio/pages-ui-components';

@customElement('agency-channel-task-panel')
export class ChannelTaskPanelElement extends LitElement {
  @property({ type: Array }) messages: QhorusMessage[] = [];
  @property({ type: Object }) commitments: Map<string, CommitmentRecord> = new Map();
  @property({ type: String }) selectedMessageId?: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Obligations');
  }

  static override readonly styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      font-family: var(--pages-font-family);
    }
    .panel-title {
      font-size: var(--pages-font-size-sm);
      font-weight: var(--pages-font-weight-semibold);
      padding: var(--pages-space-3) var(--pages-space-4);
      border-bottom: 1px solid var(--pages-neutral-4);
      color: var(--pages-neutral-12);
    }
    .group-label {
      font-size: var(--pages-font-size-xs);
      font-weight: var(--pages-font-weight-medium);
      color: var(--pages-neutral-8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: var(--pages-space-2) var(--pages-space-4) var(--pages-space-1);
    }
    .task-row {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-1);
      padding: var(--pages-space-2) var(--pages-space-4);
      cursor: pointer;
      border-bottom: 1px solid var(--pages-neutral-3);
    }
    .task-row:hover { background: var(--pages-neutral-2); }
    .task-row.selected { background: var(--pages-accent-2); }
    .task-row.overdue { border-left: 3px solid var(--pages-danger-9); }
    .task-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2);
    }

    .sender-target {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-neutral-9);
    }
    .content-preview {
      font-size: var(--pages-font-size-sm);
      color: var(--pages-neutral-11);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .timestamp {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-neutral-8);
    }
    .deadline-indicator {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-danger-9);
      font-weight: var(--pages-font-weight-medium);
    }
    .terminal-group { opacity: 0.7; }
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-8);
      font-size: var(--pages-font-size-sm);
    }
  `;

  private _commands(): QhorusMessage[] {
    return this.messages.filter(m => isObligationCreating(m.messageType));
  }

  private _isOverdue(record: CommitmentRecord | undefined): boolean {
    if (!record?.deadline) return false;
    return record.state === 'OPEN' && new Date(record.deadline) < new Date();
  }

  private _isTerminal(state: string): boolean {
    return isTerminalCommitmentState(state as CommitmentState);
  }

  private _formatTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return `${Math.floor(diffHr / 24)}d`;
  }

  private _onRowClick(msg: QhorusMessage) {
    emitPagesEvent(this, ChannelEventTopics.MESSAGE_SELECTED, { message: msg });
  }

  override render() {
    const commands = this._commands();
    if (commands.length === 0) {
      return html`<div class="panel-title">Tasks</div><div class="empty">No commitments in this channel</div>`;
    }

    const active: QhorusMessage[] = [];
    const overdue: QhorusMessage[] = [];
    const terminal: QhorusMessage[] = [];

    for (const cmd of commands) {
      const record = cmd.correlationId ? this.commitments.get(cmd.correlationId) : undefined;
      const state = record?.state ?? 'OPEN';
      if (this._isOverdue(record)) {
        overdue.push(cmd);
      } else if (this._isTerminal(state)) {
        terminal.push(cmd);
      } else {
        active.push(cmd);
      }
    }

    return html`
      <div class="panel-title">Tasks</div>
      ${overdue.length > 0 ? html`
        <div class="group-label">Overdue</div>
        ${overdue.map(m => this._renderRow(m))}
      ` : nothing}
      ${active.length > 0 ? html`
        <div class="group-label">Active</div>
        ${active.map(m => this._renderRow(m))}
      ` : nothing}
      ${terminal.length > 0 ? html`
        <div class="group-label terminal-group">Completed</div>
        <div class="terminal-group">
          ${terminal.map(m => this._renderRow(m))}
        </div>
      ` : nothing}
    `;
  }

  private _renderRow(msg: QhorusMessage) {
    const record = msg.correlationId ? this.commitments.get(msg.correlationId) : undefined;
    const state = record?.state ?? 'OPEN';
    const isOverdue = this._isOverdue(record);
    const isSelected = this.selectedMessageId === msg.id;

    return html`
      <div class="task-row ${isOverdue ? 'overdue' : ''} ${isSelected ? 'selected' : ''}"
           @click=${() => this._onRowClick(msg)}>
        <div class="task-header">
          <pages-status-badge domain="commitment" .state=${state}></pages-status-badge>
          <span class="timestamp">${this._formatTime(msg.createdAt)}</span>
          ${isOverdue && record?.deadline ? html`
            <span class="deadline-indicator">overdue</span>
          ` : nothing}
        </div>
        <div class="content-preview">${msg.content.split('\n')[0]}</div>
        <div class="sender-target">
          ${msg.sender}${msg.target ? html` → ${msg.target}` : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-task-panel': ChannelTaskPanelElement;
  }
}
