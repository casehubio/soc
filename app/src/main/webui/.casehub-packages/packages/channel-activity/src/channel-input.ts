import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import { MESSAGE_TYPES, type MessageType, type QhorusTopic, type QhorusMessage } from './types.js';
import '@casehubio/pages-ui-components';

@customElement('agency-channel-input')
export class ChannelInputElement extends LitElement {
  @property({ type: String }) channelId = '';
  @property({ type: Object }) replyTo?: { messageId: string; senderName: string } | undefined;
  @property({ type: Boolean }) showTypeSelector = false;
  @property({ attribute: false }) messageTypes: MessageType[] = [...MESSAGE_TYPES];
  @property({ attribute: false }) allowedTypes?: MessageType[];
  @property({ attribute: false }) deniedTypes?: MessageType[];
  @property({ attribute: false }) renderError?: (error: string) => TemplateResult;
  @property({ type: String }) topic = '';
  @property({ type: String }) topicId = '';
  @property({ type: Array }) topics: QhorusTopic[] = [];
  @property({ type: Boolean }) showTopicSelector = false;
  @property({ attribute: false }) correctionTarget?: Pick<QhorusMessage, 'id' | 'content' | 'sender' | 'createdAt'> | undefined;

  @state() private _text = '';
  @state() private _error = '';
  @state() private _selectedType: MessageType = 'COMMAND';

  @query('textarea') private _textarea!: HTMLTextAreaElement;

  static override readonly styles = css`
    :host {
      display: block;
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      border-top: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .reply-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      background: var(--pages-accent-2, #eef2ff);
      border-radius: var(--pages-radius-sm, 4px);
      margin-bottom: var(--pages-space-2, 8px);
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-accent-11, #3730a3);
    }
    .reply-cancel {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--pages-neutral-8, #888);
      font-size: 14px;
    }
    .type-selector {
      margin-bottom: var(--pages-space-2, 8px);
    }
    .type-selector select {
      background: var(--pages-neutral-1, #fafafa);
      color: var(--pages-neutral-12, #111);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-sm, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      font-size: var(--pages-font-size-xs, 11px);
      font-family: var(--pages-font-family, 'Inter', system-ui, sans-serif);
    }
    textarea {
      width: 100%;
      resize: none;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-md, 6px);
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      font-family: var(--pages-font-family, 'Inter', system-ui, sans-serif);
      font-size: var(--pages-font-size-base, 14px);
      line-height: var(--pages-line-height-base, 20px);
      color: var(--pages-neutral-12, #111);
      background: var(--pages-neutral-1, #fafafa);
      min-height: 40px;
      max-height: 200px;
      overflow-y: auto;
      box-sizing: border-box;
    }
    textarea:focus {
      outline: none;
      border-color: var(--pages-accent-7, #818cf8);
      box-shadow: 0 0 0 2px var(--pages-accent-3, #e0e7ff);
    }
    .error {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-danger-11, #991b1b);
      margin-top: var(--pages-space-1, 4px);
    }
    .topic-pill {
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-full, 9999px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      background: var(--pages-accent-2, #eef2ff);
      color: var(--pages-accent-11, #3730a3);
      font-size: var(--pages-font-size-xs, 11px);
      cursor: pointer;
      margin-bottom: var(--pages-space-2, 8px);
    }
    .topic-pill.read-only {
      cursor: default;
      opacity: 0.7;
    }
    .new-topic-btn {
      background: none;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-full, 9999px);
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 14px;
      color: var(--pages-neutral-8, #888);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--pages-space-2, 8px);
    }
    .new-topic-btn:hover { background: var(--pages-neutral-3, #e5e5e5); }
    .input-row {
      display: flex;
      align-items: flex-end;
      gap: var(--pages-space-2, 8px);
    }
    .input-row textarea { flex: 1; }
    .send-btn {
      width: 32px; height: 32px;
      border: none; border-radius: 50%;
      background: var(--pages-accent-9, #007bff);
      color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .send-btn:disabled {
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-neutral-8, #999);
      cursor: default;
    }
    .correction-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      background: var(--pages-warning-2, #fefce8);
      border: 1px solid var(--pages-warning-6, #facc15);
      border-radius: var(--pages-radius-sm, 4px);
      margin-bottom: var(--pages-space-2, 8px);
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-warning-11, #854d0e);
    }
    .correction-cancel {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--pages-neutral-8, #888);
      font-size: 14px;
    }
  `;

  computeAvailableTypes(): MessageType[] {
    let types = this.messageTypes;
    if (this.allowedTypes?.length) {
      types = types.filter(t => this.allowedTypes!.includes(t));
    }
    if (this.deniedTypes?.length) {
      types = types.filter(t => !this.deniedTypes!.includes(t));
    }
    return types;
  }

  private get _hasContent(): boolean {
    return this._text.trim().length > 0;
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.correctionTarget) {
      this._cancelCorrection();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._send();
    }
  }

  private _handleInput() {
    this._text = this._textarea.value;
    this._autoResize();
  }

  private _autoResize() {
    const ta = this._textarea;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }

  private _send() {
    const content = this._text.trim();
    if (!content || !this.channelId) return;

    this._error = '';

    if (this.correctionTarget) {
      emitPagesEvent(this, ChannelEventTopics.CORRECT_MESSAGE, {
        messageId: this.correctionTarget.id,
        correctedContent: content,
      });
      this.correctionTarget = undefined;
    } else {
      emitPagesEvent(this, ChannelEventTopics.SEND_MESSAGE, {
        channelId: this.channelId,
        content,
        ...(this.replyTo ? { inReplyTo: this.replyTo.messageId } : {}),
        ...(this.showTypeSelector ? { speechAct: this._selectedType } : {}),
        ...(this.showTopicSelector && this.topicId ? { topicId: this.topicId } : {}),
      });
      this.replyTo = undefined;
    }

    this._text = '';
    this._textarea.value = '';
    this._textarea.style.height = 'auto';
  }

  private _cancelReply() {
    this.replyTo = undefined;
  }

  private _cancelCorrection() {
    this.correctionTarget = undefined;
    this._text = '';
    this._textarea.value = '';
    this._textarea.style.height = 'auto';
  }

  private _onTypeChange(e: Event) {
    this._selectedType = (e.target as HTMLSelectElement).value as MessageType;
  }

  setError(error: string) {
    this._error = error;
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('correctionTarget') && this.correctionTarget) {
      this._text = this.correctionTarget.content;
      if (this._textarea) {
        this._textarea.value = this.correctionTarget.content;
        this._autoResize();
      }
    }
  }

  override render() {
    const availableTypes = this.computeAvailableTypes();
    const inCorrectionMode = !!this.correctionTarget;

    return html`
      ${inCorrectionMode ? html`
        <div class="correction-banner">
          <span>Correcting message from <strong>${this.correctionTarget!.sender}</strong></span>
          <pages-button class="correction-cancel" variant="ghost" size="sm" aria-label="Cancel correction" @click=${this._cancelCorrection}>✕</pages-button>
        </div>
      ` : nothing}
      ${!inCorrectionMode && this.replyTo ? html`
        <div class="reply-banner">
          <span>Replying to <strong>${this.replyTo.senderName}</strong></span>
          <pages-button class="reply-cancel" variant="ghost" size="sm" aria-label="Cancel reply" @click=${this._cancelReply}>✕</pages-button>
        </div>
      ` : nothing}
      ${this.showTopicSelector ? html`
        <span class="topic-pill ${this.replyTo ? 'read-only' : ''}">${this.topic || 'General'}</span>
      ` : html`
        <pages-button class="new-topic-btn" variant="ghost" size="sm" aria-label="New topic">+</pages-button>
      `}
      ${this.showTypeSelector ? html`
        <div class="type-selector">
          <select @change=${this._onTypeChange} .value=${this._selectedType}>
            ${availableTypes.map(t => html`<option value=${t}>${t}</option>`)}
          </select>
        </div>
      ` : nothing}
      <div class="input-row">
        <textarea
          aria-label="Message"
          placeholder="Type a message..."
          @keydown=${this._handleKeydown}
          @input=${this._handleInput}
          rows="1"
        ></textarea>
        <button class="send-btn"
          ?disabled=${!this._hasContent}
          title=${inCorrectionMode ? 'Confirm correction' : 'Send message'}
          aria-label=${inCorrectionMode ? 'Confirm correction' : 'Send message'}
          @click=${this._send}>
          ${inCorrectionMode ? html`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ` : html`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          `}
        </button>
      </div>
      ${this._error ? (this.renderError?.(this._error) ?? html`<div class="error">${this._error}</div>`) : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-input': ChannelInputElement;
  }
}
