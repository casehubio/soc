import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QhorusMessage, CommitmentState, Reaction, ActorType } from './types.js';

import './channel-message.js';
import '@casehubio/pages-ui-components';

@customElement('agency-channel-thread')
export class ChannelThreadElement extends LitElement {
  @property({ type: Object }) rootMessage!: QhorusMessage;
  @property({ type: Array }) replies: QhorusMessage[] = [];
  @property({ type: Array }) reactions: Reaction[] = [];
  @property({ type: Boolean }) collapsed = true;
  @property({ type: String }) commitmentState?: CommitmentState;
  @property({ type: String }) selectedMessageId?: string;
  @property({ attribute: false }) renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
  @property({ attribute: false }) formatSender: (sender: string, actorType: ActorType) => string = (s) => s;

  @property({ type: String }) currentActorId?: string;

  static override readonly styles = css`
    :host {
      display: block;
      border-left: 2px solid var(--pages-neutral-5, #d4d4d4);
      margin: var(--pages-space-2, 8px) 0;
      border-radius: var(--pages-radius-sm, 4px);
    }
    .thread-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
    }
    .thread-toggle {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-accent-9, #6366f1);
    }
    .thread-age {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-8, #888);
    }

    .reply { padding-left: var(--pages-space-4, 16px); }
    .root-message.selected,
    .reply.selected {
      background: var(--pages-accent-3, #e0e7ff);
      border-radius: var(--pages-radius-sm, 4px);
    }
  `;

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('selectedMessageId') && this.selectedMessageId && this.collapsed) {
      if (this.replies.some(r => r.id === this.selectedMessageId)) {
        this.collapsed = false;
      }
    }
  }

  private _toggle() {
    this.collapsed = !this.collapsed;
  }

  private _summary(): string {
    const count = this.replies.length;
    if (count === 0) return 'no replies';
    return `${count} ${count === 1 ? 'reply' : 'replies'}`;
  }

  private _lastActivityAge(): string | null {
    if (this.replies.length === 0) return null;
    const latest = this.replies[this.replies.length - 1]!;
    const ms = Date.now() - new Date(latest.createdAt).getTime();
    if (ms < 60_000) return 'just now';
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  override render() {
    if (!this.rootMessage) return nothing;

    return html`
      <div class="root-message ${this.selectedMessageId === this.rootMessage.id ? 'selected' : ''}">
        <agency-channel-message .message=${this.rootMessage}
                        .reactions=${this.reactions.filter(r => r.messageId === this.rootMessage.id)}
                        .commitmentState=${this.commitmentState}
                        .renderContent=${this.renderContent}
                        .formatSender=${this.formatSender}
                        .currentActorId=${this.currentActorId}></agency-channel-message>
      </div>
      ${this.replies.length > 0 ? html`
        <div class="thread-header">
          <pages-button class="thread-toggle" variant="ghost" size="sm"
                  @click=${this._toggle}
                  aria-expanded=${!this.collapsed}>
            ${this.collapsed ? '▶' : '▼'} ${this._summary()}
          </pages-button>
          ${this._lastActivityAge() ? html`<span class="thread-age">${this._lastActivityAge()}</span>` : nothing}
          ${this.commitmentState ? html`
            <pages-status-badge domain="commitment" .state=${this.commitmentState}></pages-status-badge>
          ` : nothing}
        </div>
        ${!this.collapsed ? html`
          ${this.replies.map(r => html`
            <div class="reply ${this.selectedMessageId === r.id ? 'selected' : ''}">
              <agency-channel-message .message=${r}
                              .reactions=${this.reactions.filter(rx => rx.messageId === r.id)}
                              .renderContent=${this.renderContent}
                              .formatSender=${this.formatSender}
                              .currentActorId=${this.currentActorId}></agency-channel-message>
            </div>
          `)}
        ` : nothing}
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-thread': ChannelThreadElement;
  }
}
