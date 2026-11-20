import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import type { QhorusMessage } from './types.js';
import './channel-emoji-picker.js';

@customElement('agency-channel-hover-toolbar')
export class ChannelHoverToolbarElement extends LitElement {
  @property({ type: Object }) message?: QhorusMessage;
  @property({ type: String }) currentActorId = '';
  @state() private _overflowOpen = false;
  @state() private _retractConfirming = false;
  @state() private _emojiPickerOpen = false;

  static override readonly styles = css`
    :host {
      display: flex;
      background: var(--pages-neutral-1, white);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 6px;
      box-shadow: var(--pages-shadow-1, 0 1px 4px rgba(0,0,0,0.1));
      z-index: 50;
      position: relative;
    }
    .toolbar-btn {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      border-radius: 4px; font-size: 16px;
      color: var(--pages-neutral-9, #888);
    }
    .toolbar-btn:hover {
      background: var(--pages-neutral-3, #e8e8e8);
      color: var(--pages-neutral-12, #111);
    }
    .overflow-menu {
      position: absolute; top: 100%; right: 0;
      background: var(--pages-neutral-1, white);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 6px;
      box-shadow: var(--pages-shadow-2, 0 4px 12px rgba(0,0,0,0.15));
      z-index: 100; min-width: 160px;
      padding: 4px 0;
    }
    .overflow-item {
      display: block; width: 100%;
      padding: 8px 12px;
      background: none; border: none; cursor: pointer;
      font-size: 13px; text-align: left;
      color: var(--pages-neutral-12, #111);
    }
    .overflow-item:hover {
      background: var(--pages-neutral-3, #e8e8e8);
    }
    .retract-confirm {
      position: absolute; top: 100%; right: 0;
      background: var(--pages-neutral-1, white);
      border: 1px solid var(--pages-danger-6, #fca5a5);
      border-radius: 6px;
      box-shadow: var(--pages-shadow-2, 0 4px 12px rgba(0,0,0,0.15));
      z-index: 100; min-width: 220px;
      padding: 12px;
    }
    .retract-confirm p {
      margin: 0 0 8px;
      font-size: 13px;
      color: var(--pages-neutral-12, #111);
    }
    .retract-confirm .retract-note {
      font-size: 11px;
      color: var(--pages-neutral-8, #888);
      margin-bottom: 8px;
    }
    .retract-confirm-actions {
      display: flex; gap: 8px; justify-content: flex-end;
    }
    .retract-cancel-btn {
      padding: 4px 10px; border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: 4px; background: none; cursor: pointer;
      font-size: 12px; color: var(--pages-neutral-11, #333);
    }
    .retract-confirm-btn {
      padding: 4px 10px; border: none;
      border-radius: 4px; background: var(--pages-danger-9, #dc2626);
      color: white; cursor: pointer; font-size: 12px;
    }
    .retract-cancel-btn:hover { background: var(--pages-neutral-3, #e8e8e8); }
    .retract-confirm-btn:hover { background: var(--pages-danger-10, #b91c1c); }
    .emoji-picker-popover {
      position: fixed;
      z-index: 1000;
      box-shadow: var(--pages-shadow-2, 0 4px 12px rgba(0,0,0,0.15));
      border-radius: 8px;
      overflow: hidden;
      max-height: 60vh;
    }
  `;

  private get _isOwnMessage(): boolean {
    return !!this.message && this.message.sender === this.currentActorId;
  }

  private get _isSystemMessage(): boolean {
    return this.message?.actorType === 'SYSTEM';
  }

  override render() {
    if (!this.message) return nothing;
    return html`
      <button class="toolbar-btn react" title="React" aria-label="Add reaction"
        @click=${this._onReact}>😊</button>
      <button class="toolbar-btn reply" title="Reply" aria-label="Reply"
        @click=${this._onReply}>↩</button>
      <button class="toolbar-btn more" title="More" aria-label="More actions"
        @click=${this._toggleOverflow}>⋯</button>
      ${this._emojiPickerOpen ? html`<div class="emoji-picker-popover"><agency-channel-emoji-picker @emoji-selected=${this._onEmojiSelected}></agency-channel-emoji-picker></div>` : nothing}
      ${this._retractConfirming ? this._renderRetractConfirm() : this._overflowOpen ? this._renderOverflow() : nothing}
    `;
  }

  private _onReact() {
    this._emojiPickerOpen = !this._emojiPickerOpen;
    if (this._emojiPickerOpen) {
      this.updateComplete.then(() => this._positionPicker());
    }
  }

  private _positionPicker() {
    const popover = this.renderRoot.querySelector('.emoji-picker-popover') as HTMLElement | null;
    const btn = this.renderRoot.querySelector('.toolbar-btn.react') as HTMLElement | null;
    if (!popover || !btn) return;
    const btnRect = btn.getBoundingClientRect();
    const pickerH = Math.min(popover.scrollHeight, window.innerHeight * 0.6);
    const spaceBelow = window.innerHeight - btnRect.bottom - 8;
    if (spaceBelow >= pickerH) {
      popover.style.top = `${btnRect.bottom + 4}px`;
    } else {
      popover.style.top = `${Math.max(8, btnRect.top - pickerH - 4)}px`;
    }
    const pickerW = 352;
    popover.style.left = `${Math.max(8, Math.min(btnRect.left, window.innerWidth - pickerW - 8))}px`;
  }

  private _onEmojiSelected(e: CustomEvent) {
    const emoji = e.detail?.emoji;
    if (emoji && this.message) {
      emitPagesEvent(this, ChannelEventTopics.REACT, { messageId: this.message.id, emoji });
    }
    this._emojiPickerOpen = false;
  }

  private _onReply() {
    emitPagesEvent(this, ChannelEventTopics.MESSAGE_SELECTED, { message: this.message });
  }

  private _toggleOverflow() {
    this._overflowOpen = !this._overflowOpen;
  }

  private _renderOverflow() {
    return html`
      <div class="overflow-menu">
        ${this._isOwnMessage && !this._isSystemMessage ? html`
          <button class="overflow-item" data-action="correct"
            @click=${this._onCorrect}>Correct</button>
        ` : nothing}
        ${this._isOwnMessage ? html`
          <button class="overflow-item" data-action="retract"
            @click=${this._onRetract}>Retract</button>
        ` : nothing}
        <button class="overflow-item" data-action="details"
          @click=${this._onViewDetails}>View details</button>
        <button class="overflow-item" data-action="copy"
          @click=${this._onCopy}>Copy text</button>
      </div>
    `;
  }

  private _onCorrect() {
    emitPagesEvent(this, ChannelEventTopics.CORRECT_MESSAGE, { messageId: this.message!.id });
    this._overflowOpen = false;
  }

  private _onRetract() {
    this._overflowOpen = false;
    this._retractConfirming = true;
  }

  private _confirmRetract() {
    emitPagesEvent(this, ChannelEventTopics.RETRACT_MESSAGE, { messageId: this.message!.id });
    this._retractConfirming = false;
  }

  private _cancelRetract() {
    this._retractConfirming = false;
  }

  private _renderRetractConfirm() {
    return html`
      <div class="retract-confirm">
        <p>Retract this message?</p>
        <div class="retract-note">This action is visible to all participants.</div>
        <div class="retract-confirm-actions">
          <button class="retract-cancel-btn" @click=${this._cancelRetract}>Cancel</button>
          <button class="retract-confirm-btn" @click=${this._confirmRetract}>Retract</button>
        </div>
      </div>
    `;
  }

  private _onViewDetails() {
    emitPagesEvent(this, ChannelEventTopics.MESSAGE_SELECTED, { message: this.message });
    this._overflowOpen = false;
  }

  private _onCopy() {
    navigator.clipboard.writeText(this.message?.content ?? '').catch(() => {});
    this._overflowOpen = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-hover-toolbar': ChannelHoverToolbarElement;
  }
}
