import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import { formatTimestamp } from '@casehubio/mosaic-core';
import type { ThreadStreamEntry, ThreadAnchor, ThreadInfo } from './types.js';

const AGENT_LABELS: Record<string, string> = {
  REV: 'Reviewer',
  IMP: 'Implementer',
  HUMAN: 'Human',
  SUPERVISOR: 'Supervisor',
  MODERATOR: 'Moderator',
  SELECTOR: 'Selector',
};

@customElement('selection-threads')
export class SelectionThreads extends LitElement {
  @state() private _threads: Map<string, ThreadInfo> = new Map();
  @state() private _selectedThreadId: string | null = null;
  @state() private _debateSessionId: string | null = null;
  @state() private _replyText = '';

  private _cleanups: (() => void)[] = [];
  private _configured = false;

  configure(props: Record<string, unknown>): void {
    this._configured = true;
    if (props.debateSessionId !== undefined) {
      this._debateSessionId = props.debateSessionId as string;
      this._threads = new Map();
      this._selectedThreadId = null;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Selection threads');
    this._cleanups.push(
      onPagesEvent<ThreadStreamEntry[]>(document, 'thread-entries', (entries) => {
        for (const entry of entries) {
          this._handleEntry(entry);
        }
        this.requestUpdate();
      }),
      onPagesEvent<{ threadId: string; anchor: ThreadAnchor; createdBy: string }>(
        document, 'thread-created', (payload) => {
          if (!this._threads.has(payload.threadId)) {
            this._threads.set(payload.threadId, {
              threadId: payload.threadId,
              anchor: payload.anchor,
              status: 'OPEN',
              entries: [],
              createdBy: payload.createdBy,
            });
            this.requestUpdate();
          }
        },
      ),
      onPagesEvent<{ threadId: string }>(document, 'thread-resolved', (payload) => {
        const thread = this._threads.get(payload.threadId);
        if (thread) {
          thread.status = 'RESOLVED';
          this.requestUpdate();
        }
      }),
      onPagesEvent(document, 'reconnected', () => {
        this._threads = new Map();
        this._selectedThreadId = null;
      }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
  }

  private _handleEntry(entry: ThreadStreamEntry): void {
    let thread = this._threads.get(entry.threadId);

    if (entry.threadAction === 'START' && !thread && entry.anchor) {
      thread = {
        threadId: entry.threadId,
        anchor: entry.anchor,
        status: 'OPEN',
        entries: [],
        createdBy: entry.agentRole,
      };
      this._threads.set(entry.threadId, thread);
    }

    if (!thread) return;

    if (entry.threadAction === 'RESOLVE') {
      thread.status = 'RESOLVED';
      return;
    }

    if (entry.threadAction === 'START' || entry.threadAction === 'REPLY') {
      thread.entries.push(entry);
    }
  }

  private _selectThread(threadId: string): void {
    this._selectedThreadId = threadId;
    this._replyText = '';
    const thread = this._threads.get(threadId);
    this.dispatchEvent(new CustomEvent('thread-selected', {
      bubbles: true,
      composed: true,
      detail: { threadId },
    }));
    if (thread) {
      document.dispatchEvent(new CustomEvent('thread-focused', {
        bubbles: true,
        detail: {
          side: thread.anchor.side,
          startLine: thread.anchor.startLine,
          endLine: thread.anchor.endLine,
        },
      }));
    }
  }

  private _goBack(): void {
    this._selectedThreadId = null;
    this._replyText = '';
  }

  private async _submitReply(): Promise<void> {
    if (!this._debateSessionId || !this._selectedThreadId || !this._replyText.trim()) return;
    try {
      await fetch(`/api/debate/${this._debateSessionId}/human/thread/${this._selectedThreadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: this._replyText.trim() }),
      });
      this._replyText = '';
    } catch (e) {
      console.error('Thread reply failed:', e);
    }
  }

  private async _resolveThread(threadId: string): Promise<void> {
    if (!this._debateSessionId) return;
    try {
      await fetch(`/api/debate/${this._debateSessionId}/human/thread/${threadId}/resolve`, {
        method: 'POST',
      });
    } catch (e) {
      console.error('Thread resolve failed:', e);
    }
  }



  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .thread-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .placeholder {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--pages-neutral-8, #9ca3af);
      font-size: 13px;
      text-align: center;
      padding: 40px;
    }

    .thread-card {
      padding: 10px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e7eb);
      border-radius: 3px;
      background: var(--pages-neutral-1, #fafafa);
      cursor: pointer;
      transition: all 0.15s;
    }
    .thread-card:hover {
      border-color: var(--pages-accent-9, #6366f1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .thread-card.resolved {
      opacity: 0.5;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 11px;
      color: var(--pages-neutral-8, #9ca3af);
    }

    .status-badge {
      padding: 1px 5px;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-open { background: var(--pages-success-2, #dcfce7); color: var(--pages-success-9, #16a34a); }
    .status-resolved { background: var(--pages-neutral-3, #e5e7eb); color: var(--pages-neutral-8, #9ca3af); }

    .anchor-text {
      font-size: 12px;
      color: var(--pages-neutral-12, #111);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .reply-count {
      margin-left: auto;
      font-size: 10px;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--pages-neutral-4, #e5e7eb);
    }

    .back-btn {
      cursor: pointer;
      background: none;
      border: none;
      font-size: 14px;
      color: var(--pages-neutral-8, #9ca3af);
      padding: 2px 6px;
    }
    .back-btn:hover { color: var(--pages-neutral-12, #111); }

    .resolve-btn {
      margin-left: auto;
      cursor: pointer;
      background: none;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: 3px;
      font-size: 11px;
      padding: 3px 8px;
      color: var(--pages-neutral-8, #9ca3af);
    }
    .resolve-btn:hover { background: var(--pages-neutral-2, #f5f5f5); }

    .entry-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .entry {
      padding: 8px 10px;
      border-left: 2px solid var(--pages-neutral-4, #e5e7eb);
      font-size: 13px;
    }

    .entry-header {
      font-size: 11px;
      color: var(--pages-neutral-8, #9ca3af);
      margin-bottom: 4px;
    }
    .entry-agent { font-weight: 600; color: var(--pages-neutral-11, #6b7280); }
    .entry-agent.human { color: var(--human-badge, #e67e22); }

    .entry-content {
      color: var(--pages-neutral-12, #111);
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .reply-area {
      padding: 8px 12px;
      border-top: 1px solid var(--pages-neutral-4, #e5e7eb);
      display: flex;
      gap: 6px;
    }

    .reply-input {
      flex: 1;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: 3px;
      padding: 6px 8px;
      font-size: 13px;
      font-family: inherit;
      background: var(--pages-neutral-1, #fafafa);
      color: var(--pages-neutral-12, #111);
    }

    .reply-submit {
      border: 1px solid var(--pages-accent-9, #6366f1);
      background: var(--pages-accent-9, #6366f1);
      color: white;
      border-radius: 3px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .reply-submit:hover { opacity: 0.9; }
    .reply-submit:disabled { opacity: 0.5; cursor: default; }
  `;

  private _renderThreadList() {
    const threads = [...this._threads.values()]
      .sort((a, b) => a.anchor.startLine - b.anchor.startLine);

    if (threads.length === 0) {
      return html`<div class="placeholder">No threads yet.<br>Select text in the diff to start one.</div>`;
    }

    return html`
      <div class="thread-list">
        ${threads.map(t => html`
          <div class="thread-card ${t.status === 'RESOLVED' ? 'resolved' : ''}"
               @click=${() => this._selectThread(t.threadId)}>
            <div class="card-header">
              <span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span>
              <span>Side ${t.anchor.side}, L${t.anchor.startLine}–${t.anchor.endLine}</span>
              <span class="reply-count">${t.entries.length} ${t.entries.length === 1 ? 'entry' : 'entries'}</span>
            </div>
            <div class="anchor-text">${t.anchor.selectedText}</div>
          </div>
        `)}
      </div>
    `;
  }

  private _renderThreadDetail(thread: ThreadInfo) {
    return html`
      <div class="detail-header">
        <button class="back-btn" @click=${this._goBack}>&larr;</button>
        <span class="status-badge status-${thread.status.toLowerCase()}">${thread.status}</span>
        <span style="font-size:11px;color:var(--pages-neutral-8)">
          Side ${thread.anchor.side}, L${thread.anchor.startLine}–${thread.anchor.endLine}
        </span>
        ${thread.status === 'OPEN' ? html`
          <button class="resolve-btn" @click=${() => this._resolveThread(thread.threadId)}>Resolve</button>
        ` : nothing}
      </div>
      <div class="entry-list">
        ${thread.entries.map(e => html`
          <div class="entry">
            <div class="entry-header">
              <span class="entry-agent ${e.agentRole === 'HUMAN' ? 'human' : ''}">
                ${e.agentRole === 'HUMAN' ? '\u{1F464} ' : ''}${AGENT_LABELS[e.agentRole] || e.agentRole}
              </span>
              ${e.timestamp ? html` · ${formatTimestamp(e.timestamp)}` : nothing}
            </div>
            <div class="entry-content">${e.content}</div>
          </div>
        `)}
      </div>
      ${thread.status === 'OPEN' ? html`
        <div class="reply-area">
          <input class="reply-input" type="text" placeholder="Reply..."
                 .value=${this._replyText}
                 @input=${(e: InputEvent) => { this._replyText = (e.target as HTMLInputElement).value; }}
                 @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' && this._replyText.trim()) this._submitReply(); }}>
          <button class="reply-submit" ?disabled=${!this._replyText.trim()}
                  @click=${this._submitReply}>Reply</button>
        </div>
      ` : nothing}
    `;
  }

  override render() {
    if (!this._configured) {
      return html`<div class="placeholder">Waiting for debate session...</div>`;
    }

    if (this._selectedThreadId) {
      const thread = this._threads.get(this._selectedThreadId);
      if (thread) return this._renderThreadDetail(thread);
    }

    return this._renderThreadList();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'selection-threads': SelectionThreads;
  }
}
