import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QhorusMessage } from './types.js';
import { messageTypeCategory, isObligationCreating } from './types.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import type { CommitmentRecord } from './commitment.js';
import '@casehubio/pages-ui-components';

@customElement('agency-channel-correlation-panel')
export class ChannelCorrelationPanelElement extends LitElement {
  @property({ type: Array }) messages: QhorusMessage[] = [];
  @property({ type: Object }) commitments: Map<string, CommitmentRecord> = new Map();
  @property({ type: String }) selectedMessageId?: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Message correlation');
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
    .flow-container {
      padding: var(--pages-space-3) var(--pages-space-4);
    }
    .flow-node {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-1);
      padding: var(--pages-space-2) var(--pages-space-3);
      border: 1px solid var(--pages-neutral-4);
      border-radius: var(--pages-radius-sm);
      cursor: pointer;
      background: var(--pages-neutral-1);
    }
    .flow-node:hover { background: var(--pages-neutral-2); }
    .flow-node.selected { border-color: var(--pages-accent-9); border-width: 2px; }
    .flow-node-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2);
      font-size: var(--pages-font-size-xs);
    }
    .actor-icon { font-size: var(--pages-font-size-sm); }
    .sender { font-weight: var(--pages-font-weight-semibold); color: var(--pages-neutral-12); }
    .speech-act-badge {
      font-size: 10px;
      font-weight: var(--pages-font-weight-medium);
      padding: 1px 6px;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .badge-info { background: var(--pages-info-3); color: var(--pages-info-11); }
    .badge-obligation { background: var(--pages-accent-3); color: var(--pages-accent-11); }
    .badge-success { background: var(--pages-success-3); color: var(--pages-success-11); }
    .badge-danger { background: var(--pages-danger-3); color: var(--pages-danger-11); }
    .badge-warning { background: var(--pages-warning-3); color: var(--pages-warning-11); }
    .badge-transfer { background: var(--pages-info-3); color: var(--pages-info-11); }
    .badge-telemetry { background: var(--pages-neutral-3); color: var(--pages-neutral-9); }

    .node-content {
      font-size: var(--pages-font-size-sm);
      color: var(--pages-neutral-11);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .node-time {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-neutral-8);
    }
    .delegation-indicator {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-info-9);
    }
    .flow-connector {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2);
      padding: var(--pages-space-1) 0 var(--pages-space-1) 20px;
    }
    .connector-line {
      width: 2px;
      height: 16px;
      background: var(--pages-neutral-5);
    }
    .flow-duration {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-neutral-8);
    }
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-8);
      font-size: var(--pages-font-size-sm);
    }
  `;

  private _actorIcon(type: string): string {
    switch (type) {
      case 'HUMAN': return '\u{1F464}';
      case 'AGENT': return '\u{1F916}';
      case 'SYSTEM': return '⚙';
      default: return '?';
    }
  }

  private _formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  private _formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  private _getChain(): QhorusMessage[] {
    if (!this.selectedMessageId) return [];
    const selected = this.messages.find(m => m.id === this.selectedMessageId);
    if (!selected) return [];

    if (selected.correlationId) {
      return this.messages
        .filter(m => m.correlationId === selected.correlationId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    if (selected.inReplyTo) {
      const chain: QhorusMessage[] = [];
      const visited = new Set<string>();
      let current: QhorusMessage | undefined = selected;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        chain.unshift(current);
        current = current.inReplyTo ? this.messages.find(m => m.id === current!.inReplyTo) : undefined;
      }
      const replies = this.messages.filter(m => m.inReplyTo && visited.has(m.inReplyTo) && !visited.has(m.id));
      chain.push(...replies);
      return chain.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return [];
  }

  private _onNodeClick(msg: QhorusMessage) {
    emitPagesEvent(this, ChannelEventTopics.MESSAGE_SELECTED, { message: msg });
  }

  override render() {
    const chain = this._getChain();

    if (chain.length === 0) {
      return html`
        <div class="panel-title">Correlation</div>
        <div class="empty">Select a message to view its correlation chain</div>
      `;
    }

    return html`
      <div class="panel-title">Correlation</div>
      <div class="flow-container">
        ${chain.map((msg, i) => html`
          ${i > 0 ? this._renderConnector(chain[i - 1]!, msg) : nothing}
          ${this._renderNode(msg)}
        `)}
      </div>
    `;
  }

  private _renderConnector(prev: QhorusMessage, curr: QhorusMessage) {
    const duration = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return html`
      <div class="flow-connector">
        <div class="connector-line"></div>
        <span class="flow-duration">${this._formatDuration(duration)}</span>
      </div>
    `;
  }

  private _renderNode(msg: QhorusMessage) {
    const category = messageTypeCategory(msg.messageType);
    const isSelected = this.selectedMessageId === msg.id;
    const record = msg.correlationId ? this.commitments.get(msg.correlationId) : undefined;

    return html`
      <div class="flow-node ${isSelected ? 'selected' : ''}" @click=${() => this._onNodeClick(msg)}>
        <div class="flow-node-header">
          <span class="actor-icon">${this._actorIcon(msg.actorType)}</span>
          <span class="sender">${msg.sender}</span>
          <span class="speech-act-badge badge-${category}">${msg.messageType}</span>
          ${isObligationCreating(msg.messageType) && record ? html`
            <pages-status-badge domain="commitment" .state=${record.state}></pages-status-badge>
          ` : nothing}
          <span class="node-time">${this._formatTime(msg.createdAt)}</span>
        </div>
        <div class="node-content">${msg.content.split('\n')[0]}</div>
        ${msg.messageType === 'HANDOFF' && msg.target ? html`
          <div class="delegation-indicator">↳ Delegated to ${msg.target}</div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-correlation-panel': ChannelCorrelationPanelElement;
  }
}
