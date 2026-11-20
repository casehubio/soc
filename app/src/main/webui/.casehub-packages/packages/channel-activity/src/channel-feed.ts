import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { QhorusMessage, QhorusTopic, Reaction, ActorType } from './types.js';
import { isTerminalMessageType } from './types.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin, KeyboardShortcutMixin, RovingTabindexMixin, FocusTrapMixin, type RovingDirection } from '@casehubio/pages-primitives/a11y';
import { ChannelEventTopics } from './events.js';
import './channel-message.js';
import './channel-thread.js';
import './channel-hover-toolbar.js';
import '@casehubio/pages-ui-components';

interface MessageGroup {
  sender: string;
  actorType: string;
  messages: QhorusMessage[];
}

const CURSOR_STORAGE_KEY = 'channel-activity.cursors';

const ChannelFeedBase = RovingTabindexMixin(KeyboardShortcutMixin(LiveRegionMixin(FocusTrapMixin(LitElement))));

@customElement('agency-channel-feed')
export class ChannelFeedElement extends ChannelFeedBase {
  override rovingSelector = '.message-item, agency-channel-thread';
  override rovingDirection: RovingDirection = 'vertical';

  @property({ type: Array }) messages: QhorusMessage[] = [];
  @property({ type: Array }) reactions: Reaction[] = [];
  @property({ type: String }) channelId = '';
  @property({ type: String }) channelName?: string;
  @property({ type: Boolean }) terminalDimming = true;
  @property({ type: Boolean }) eventStyling = true;
  @property({ type: Boolean }) autoScroll = true;
  @property({ type: Number }) staleCursorMinutes = 30;
  @property({ attribute: false }) renderContextHeader?: () => TemplateResult;
  @property({ type: String }) viewMode: 'flat' | 'threaded' | 'topics' = 'flat';
  @property({ type: Array }) topics: QhorusTopic[] = [];
  @property({ type: String }) selectedMessageId?: string;
  @property({ attribute: false }) renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
  @property({ attribute: false }) formatSender?: (sender: string, actorType: ActorType) => string;

  @property({ type: String }) currentActorId?: string;
  @property({ attribute: false }) messageHighlights: Record<string, string> = {};

  @state() private _prevMessageCount = 0;
  @state() private _showStalePrompt = false;
  @state() private _staleCursorId?: string;
  @state() _scrolledUp = false;
  @state() _unreadCount = 0;
  @state() private _hoveredMessageId: string | null = null;
  private _isHoveringToolbar = false;
  private _hoverLeaveTimer: ReturnType<typeof setTimeout> | null = null;
  private _correctionMap = new Map<string, QhorusMessage[]>();
  private _retractedIds = new Set<string>();

  static override readonly styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .feed {
      flex: 1;
      overflow-y: auto;
      scroll-behavior: smooth;
    }
    @media (prefers-reduced-motion: reduce) {
      .feed { scroll-behavior: auto; }
    }
    .message-group-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px) 0;
    }
    .group-sender {
      font-weight: var(--pages-font-weight-semibold, 600);
      font-size: var(--pages-font-size-sm, 13px);
    }
    .message-item.terminal-dimmed { opacity: 0.8; }
    .message-item.event-dimmed { opacity: 0.55; }
    .message-item.event-dimmed channel-message { font-style: italic; }
    .message-item.selected {
      background: var(--pages-accent-3, #e0e7ff);
      border-left: 3px solid var(--pages-accent-9, #6366f1);
      border-radius: var(--pages-radius-sm, 4px);
    }
    channel-thread.selected {
      display: block;
      border-left: 3px solid var(--pages-accent-9, #6366f1);
      border-radius: var(--pages-radius-sm, 4px);
    }
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-8, #888);
      font-size: var(--pages-font-size-sm, 13px);
    }
    .stale-prompt {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      background: var(--pages-warning-3, #fef3c7);
      border-bottom: 1px solid var(--pages-warning-11, #92400e);
      font-size: var(--pages-font-size-sm, 13px);
    }
    .stale-prompt button {
      background: var(--pages-neutral-1, #fafafa);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-sm, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      cursor: pointer;
      font-size: var(--pages-font-size-xs, 11px);
      text-align: left;
    }
    .stale-prompt button:hover { background: var(--pages-neutral-3, #e5e5e5); }
    .topic-section-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px) var(--pages-space-1, 4px);
      font-size: var(--pages-font-size-sm, 13px);
      font-weight: var(--pages-font-weight-semibold, 600);
      color: var(--pages-neutral-10, #555);
      border-top: 1px solid var(--pages-neutral-3, #e5e5e5);
    }
    .topic-section-header:first-child { border-top: none; }
    .topic-section-header .state-badge {
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: normal;
      opacity: 0.7;
    }
    .topic-section.resolved .topic-section-header { opacity: 0.6; }
    .topic-section.archived .topic-section-header { opacity: 0.5; font-style: italic; }
    .new-messages-pill {
      position: sticky;
      bottom: var(--pages-space-3, 12px);
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-3, 12px);
      background: var(--pages-accent-9, #6366f1);
      color: #fff;
      border: none;
      border-radius: var(--pages-radius-full, 9999px);
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-semibold, 600);
      cursor: pointer;
      box-shadow: var(--pages-shadow-2, 0 2px 8px rgba(0,0,0,0.15));
      z-index: 5;
    }
    .new-messages-pill:hover { background: var(--pages-accent-10, #4f46e5); }
    .message-item { position: relative; }
    .hover-toolbar-anchor {
      position: absolute;
      top: 0;
      right: var(--pages-space-3, 12px);
      z-index: 50;
      transform: translateY(-50%);
    }
  `;

  private _loadCursors(): Record<string, { id: string; ts: number }> {
    try {
      const stored = sessionStorage.getItem(CURSOR_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_e) { /* ignore */ }
    return {};
  }

  private _checkStaleCursor() {
    if (this.staleCursorMinutes <= 0 || !this.channelId) {
      this._showStalePrompt = false;
      return;
    }
    const cursors = this._loadCursors();
    const cursor = cursors[this.channelId];
    if (cursor && Date.now() - cursor.ts >= this.staleCursorMinutes * 60 * 1000) {
      this._showStalePrompt = true;
      this._staleCursorId = cursor.id;
    } else {
      this._showStalePrompt = false;
    }
  }

  private _onCatchUp() {
    this._showStalePrompt = false;
    emitPagesEvent(this, ChannelEventTopics.CURSOR_CATCHUP, {
      channelId: this.channelId,
      cursorId: this._staleCursorId,
    });
  }

  private _onReload() {
    this._showStalePrompt = false;
    emitPagesEvent(this, ChannelEventTopics.CURSOR_RELOAD, {
      channelId: this.channelId,
    });
  }

  private _applyCorrections(messages: QhorusMessage[]): QhorusMessage[] {
    return messages
      .filter(m => !m.correctsMessageId)
      .map(m => {
        const corrections = this._correctionMap.get(m.id);
        const isRetracted = this._retractedIds.has(m.id);
        if (corrections?.length || isRetracted) {
          return {
            ...m,
            content: corrections?.at(-1)?.content ?? m.content,
            _corrected: !!corrections?.length,
            _corrections: corrections ?? [],
            _retracted: isRetracted,
          } as QhorusMessage;
        }
        return m;
      });
  }

  _separateRootsAndReplies(): {
    roots: QhorusMessage[];
    repliesByParent: Map<string, QhorusMessage[]>;
  } {
    const corrected = this._applyCorrections(this.messages);
    const messageIds = new Set(corrected.map(m => m.id));
    const repliesByParent = new Map<string, QhorusMessage[]>();
    const roots: QhorusMessage[] = [];

    for (const m of corrected) {
      if (m.inReplyTo && messageIds.has(m.inReplyTo)) {
        const list = repliesByParent.get(m.inReplyTo) ?? [];
        list.push(m);
        repliesByParent.set(m.inReplyTo, list);
      } else {
        roots.push(m);
      }
    }
    return { roots, repliesByParent };
  }

  private _groupFlat(messages: QhorusMessage[]): MessageGroup[] {
    const groups: MessageGroup[] = [];
    const TWO_MINUTES = 2 * 60 * 1000;

    for (const msg of messages) {
      const last = groups[groups.length - 1];
      if (last && last.sender === msg.sender) {
        const lastTime = new Date(last.messages[last.messages.length - 1]!.createdAt).getTime();
        const thisTime = new Date(msg.createdAt).getTime();
        if (thisTime - lastTime < TWO_MINUTES) {
          last.messages = [...last.messages, msg];
          continue;
        }
      }
      groups.push({ sender: msg.sender, actorType: msg.actorType, messages: [msg] });
    }
    return groups;
  }

  private _buildReactionIndex(): Map<string, Reaction[]> {
    const index = new Map<string, Reaction[]>();
    for (const r of this.reactions) {
      const list = index.get(r.messageId);
      if (list) list.push(r);
      else index.set(r.messageId, [r]);
    }
    return index;
  }

  private _threadReactions(rootId: string, replies: QhorusMessage[], index: Map<string, Reaction[]>): Reaction[] {
    const result: Reaction[] = [];
    const rootReactions = index.get(rootId);
    if (rootReactions) result.push(...rootReactions);
    for (const r of replies) {
      const replyReactions = index.get(r.id);
      if (replyReactions) result.push(...replyReactions);
    }
    return result;
  }

  private _highlightStyle(msg: QhorusMessage): string {
    const bg = this.messageHighlights[msg.id];
    return bg ? `background: ${bg}` : '';
  }

  private _messageItemClasses(msg: QhorusMessage): string {
    const classes = ['message-item'];
    if (this.terminalDimming && isTerminalMessageType(msg.messageType)) {
      classes.push('terminal-dimmed');
    }
    if (this.eventStyling && msg.messageType === 'EVENT') {
      classes.push('event-dimmed');
    }
    if (this.selectedMessageId === msg.id) {
      classes.push('selected');
    }
    return classes.join(' ');
  }

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('channelId')) {
      this._checkStaleCursor();
    }
    if (changed.has('messages')) {
      this._correctionMap.clear();
      this._retractedIds.clear();
      for (const msg of this.messages) {
        if (msg.correctsMessageId) {
          if ((msg as any).retraction) {
            this._retractedIds.add(msg.correctsMessageId);
          }
          const list = this._correctionMap.get(msg.correctsMessageId) ?? [];
          list.push(msg);
          this._correctionMap.set(msg.correctsMessageId, list);
        }
      }
    }
    if (changed.has('messages') && this.messages.length > 0) {
      this._showStalePrompt = false;
    }
    if (changed.has('messages') && this.messages.length > this._prevMessageCount) {
      const newCount = this.messages.length - this._prevMessageCount;
      if (this._prevMessageCount > 0 && newCount > 0 && this._scrolledUp) {
        this._unreadCount += newCount;
      }
    }
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('messages') && this.autoScroll && this.messages.length > this._prevMessageCount) {
      const newCount = this.messages.length - this._prevMessageCount;
      if (this._prevMessageCount > 0 && newCount > 0) {
        this.announce(newCount === 1 ? '1 new message' : `${newCount} new messages`);
      }
      const feed = this.renderRoot.querySelector('.feed');
      if (feed) {
        const wasAtBottom = feed.scrollHeight - feed.scrollTop <= feed.clientHeight + 4;
        if (wasAtBottom) {
          requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
        }
      }
    }
    this._prevMessageCount = this.messages.length;
    if (changed.has('selectedMessageId') && this.selectedMessageId) {
      requestAnimationFrame(() => this._scrollToSelected());
    }
  }

  private _scrollToSelected() {
    if (!this.selectedMessageId) return;
    const feed = this.renderRoot.querySelector<HTMLElement>('.feed');
    if (!feed) return;
    const target = feed.querySelector(`[data-message-id="${this.selectedMessageId}"]`) as HTMLElement | null;
    if (target) {
      target.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const thread = feed.querySelector(`agency-channel-thread[data-contains~="${this.selectedMessageId}"]`) as HTMLElement | null;
    if (thread) {
      thread.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.channelId) this._checkStaleCursor();
  }

  override firstUpdated() {
    const feed = this.renderRoot.querySelector<HTMLElement>('.feed');
    if (feed) {
      feed.addEventListener('scroll', this._onFeedScroll);
      feed.addEventListener('keydown', this._onFeedKeydown);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    const feed = this.renderRoot.querySelector<HTMLElement>('.feed');
    if (feed) {
      feed.removeEventListener('scroll', this._onFeedScroll);
      feed.removeEventListener('keydown', this._onFeedKeydown);
    }
  }

  private _onFeedKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this._hoveredMessageId) {
      this._hoveredMessageId = null;
      this._isHoveringToolbar = false;
      return;
    }
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      const msgItem = target.closest?.('[data-message-id]') as HTMLElement | null;
      if (msgItem) {
        const msgId = msgItem.getAttribute('data-message-id');
        if (msgId) this._onMessageEnter(msgId);
      }
    }
  };

  private _onFeedScroll = () => {
    const feed = this.renderRoot.querySelector('.feed');
    if (!feed) return;
    const atBottom = feed.scrollHeight - feed.scrollTop <= feed.clientHeight + 4;
    if (atBottom && this._scrolledUp) {
      this._scrolledUp = false;
      this._unreadCount = 0;
    } else if (!atBottom && !this._scrolledUp) {
      this._scrolledUp = true;
    }
  };

  private _onMessageEnter(msgId: string) {
    if (this._hoverLeaveTimer) {
      clearTimeout(this._hoverLeaveTimer);
      this._hoverLeaveTimer = null;
    }
    this._hoveredMessageId = msgId;
  }

  private _onMessageLeave() {
    this._hoverLeaveTimer = setTimeout(() => {
      if (!this._isHoveringToolbar) {
        this._hoveredMessageId = null;
      }
    }, 100);
  }

  private _onToolbarEnter() {
    this._isHoveringToolbar = true;
    if (this._hoverLeaveTimer) {
      clearTimeout(this._hoverLeaveTimer);
      this._hoverLeaveTimer = null;
    }
  }

  private _onToolbarLeave() {
    this._isHoveringToolbar = false;
    this._hoveredMessageId = null;
  }

  private _renderHoverToolbar(msg: QhorusMessage) {
    if (this._hoveredMessageId !== msg.id) return nothing;
    return html`
      <div class="hover-toolbar-anchor"
        @mouseenter=${this._onToolbarEnter}
        @mouseleave=${this._onToolbarLeave}>
        <agency-channel-hover-toolbar
          .message=${msg}
          .currentActorId=${this.currentActorId ?? ''}>
        </agency-channel-hover-toolbar>
      </div>
    `;
  }

  private _scrollToBottom() {
    const feed = this.renderRoot.querySelector('.feed');
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
    this._scrolledUp = false;
    this._unreadCount = 0;
  }

  override render() {
    return html`
      ${this.renderContextHeader?.() ?? nothing}
      ${this._showStalePrompt ? html`
        <div class="stale-prompt">
          <span>You were away for a while.</span>
          <pages-button class="stale-catchup" variant="ghost" @click=${this._onCatchUp}>Catch up from where you left off</pages-button>
          <pages-button class="stale-reload" variant="ghost" @click=${this._onReload}>Reload full history</pages-button>
        </div>
      ` : nothing}
      <div class="feed" role="log" aria-live="polite">
        ${this.messages.length === 0 ? html`
          <div class="empty">No messages yet</div>
        ` : this._renderFeed()}
        ${this._scrolledUp && this._unreadCount > 0 ? html`
          <button class="new-messages-pill" @click=${this._scrollToBottom}>
            ↓ ${this._unreadCount} new ${this._unreadCount === 1 ? 'message' : 'messages'}
          </button>
        ` : nothing}
      </div>
    `;
  }

  private _renderFeed() {
    return this.viewMode === 'topics' ? this._renderTopics() : this._renderFlat();
  }

  private _renderTopics() {
    const reactionIndex = this._buildReactionIndex();
    const corrected = this._applyCorrections(this.messages);
    const byTopic = new Map<string, QhorusMessage[]>();
    for (const m of corrected) {
      const key = m.topicId ?? '';
      const list = byTopic.get(key) ?? [];
      list.push(m);
      byTopic.set(key, list);
    }
    const stateOrder = (s: string) => s === 'ACTIVE' ? 0 : s === 'RESOLVED' ? 1 : 2;
    const sortedTopics = this.topics
      .filter(t => byTopic.has(t.id))
      .sort((a, b) => stateOrder(a.state) - stateOrder(b.state));

    return sortedTopics.map(t => {
      const msgs = byTopic.get(t.id) ?? [];
      const stateClass = t.state === 'RESOLVED' ? 'resolved' : t.state === 'ARCHIVED' ? 'archived' : '';
      return html`
        <div class="topic-section ${stateClass}">
          <div class="topic-section-header">
            <span>${t.name}</span>
            ${t.state !== 'ACTIVE' ? html`<span class="state-badge">${t.state}</span>` : nothing}
          </div>
          ${this._groupFlat(msgs).map(group => html`
            <div class="message-group">
              <div class="message-group-header">
                <span class="group-sender">${group.sender}</span>
              </div>
              ${group.messages.map(msg => html`
                <div class="${this._messageItemClasses(msg)}" data-message-id=${msg.id} tabindex="-1" style=${this._highlightStyle(msg)}
                  @mouseenter=${() => this._onMessageEnter(msg.id)}
                  @mouseleave=${() => this._onMessageLeave()}>
                  ${this._renderHoverToolbar(msg)}
                  <agency-channel-message .message=${msg}
                                  .reactions=${reactionIndex.get(msg.id) ?? []}
                                  .showActorBadge=${group.messages.indexOf(msg) === 0}
                                  .channelName=${this.channelName}
                                  .renderContent=${this.renderContent}
                                  .formatSender=${this.formatSender}
                                  .currentActorId=${this.currentActorId}>
                  </agency-channel-message>
                </div>
              `)}
            </div>
          `)}
        </div>
      `;
    });
  }

  private _renderFlat() {
    const { roots, repliesByParent } = this._separateRootsAndReplies();
    const reactionIndex = this._buildReactionIndex();
    return this._groupFlat(roots).map(group => html`
      <div class="message-group">
        <div class="message-group-header">
          <span class="group-sender">${group.sender}</span>
        </div>
        ${group.messages.map(msg => repliesByParent.has(msg.id) ? html`
          <div class="${this._messageItemClasses(msg)}" data-message-id=${msg.id} tabindex="-1" style=${this._highlightStyle(msg)}
            @mouseenter=${() => this._onMessageEnter(msg.id)}
            @mouseleave=${() => this._onMessageLeave()}>
            ${this._renderHoverToolbar(msg)}
            <agency-channel-thread class=${this.selectedMessageId === msg.id || repliesByParent.get(msg.id)!.some(r => r.id === this.selectedMessageId) ? 'selected' : ''}
                           .rootMessage=${msg}
                           .replies=${repliesByParent.get(msg.id)!}
                           .reactions=${this._threadReactions(msg.id, repliesByParent.get(msg.id)!, reactionIndex)}
                           .selectedMessageId=${this.selectedMessageId}
                           .renderContent=${this.renderContent}
                           .formatSender=${this.formatSender}
                           .currentActorId=${this.currentActorId}
                           data-message-id=${msg.id}
                           data-contains=${repliesByParent.get(msg.id)!.map(r => r.id).join(' ')}>
            </agency-channel-thread>
          </div>
        ` : html`
          <div class="${this._messageItemClasses(msg)}" data-message-id=${msg.id} tabindex="-1" style=${this._highlightStyle(msg)}
            @mouseenter=${() => this._onMessageEnter(msg.id)}
            @mouseleave=${() => this._onMessageLeave()}>
            ${this._renderHoverToolbar(msg)}
            <agency-channel-message .message=${msg}
                            .reactions=${reactionIndex.get(msg.id) ?? []}
                            .showActorBadge=${group.messages.indexOf(msg) === 0}
                            .channelName=${this.channelName}
                            .parentMessage=${msg.inReplyTo ? this.messages.find(m => m.id === msg.inReplyTo) : undefined}
                            .renderContent=${this.renderContent}
                            .formatSender=${this.formatSender}
                            .currentActorId=${this.currentActorId}>
            </agency-channel-message>
          </div>
        `)}
      </div>
    `);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-feed': ChannelFeedElement;
  }
}
