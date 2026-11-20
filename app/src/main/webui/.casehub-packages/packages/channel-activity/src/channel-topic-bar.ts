import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { QhorusTopic } from './types.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import '@casehubio/pages-ui-components';

@customElement('agency-channel-topic-bar')
export class ChannelTopicBarElement extends LitElement {
  @property({ type: Array }) topics: QhorusTopic[] = [];
  @property({ type: String }) selectedTopicId: string | null = null;
  @property({ type: String }) viewMode: 'flat' | 'threaded' | 'topics' = 'flat';

  @state() private _showArchived = false;

  static override readonly styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .pills {
      display: flex;
      gap: var(--pages-space-1, 4px);
      flex: 1;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .pills::-webkit-scrollbar { display: none; }
    .topic-pill {
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-full, 9999px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      background: var(--pages-neutral-1, #fafafa);
      color: var(--pages-neutral-11, #333);
      font-size: var(--pages-font-size-xs, 11px);
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s;
    }
    .topic-pill:hover {
      background: var(--pages-neutral-3, #e5e5e5);
    }
    .topic-pill.active {
      background: var(--pages-accent-3, #e0e7ff);
      border-color: var(--pages-accent-7, #818cf8);
      color: var(--pages-accent-11, #3730a3);
    }
    .topic-pill.resolved {
      opacity: 0.6;
    }
    .topic-pill.archived {
      opacity: 0.5;
      font-style: italic;
    }
    .count {
      background: var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-full, 9999px);
      padding: 0 var(--pages-space-1, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      min-width: 16px;
      text-align: center;
    }
    .topic-pill.active .count {
      background: var(--pages-accent-5, #c7d2fe);
    }
    .separator {
      width: 1px;
      height: 20px;
      background: var(--pages-neutral-4, #e5e5e5);
      flex-shrink: 0;
    }
    .mode-btn {
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-full, 9999px);
      background: var(--pages-neutral-1, #fafafa);
      color: var(--pages-neutral-11, #333);
      font-size: var(--pages-font-size-xs, 11px);
      cursor: pointer;
      flex-shrink: 0;
    }
    .mode-btn.active {
      background: var(--pages-accent-3, #e0e7ff);
      border-color: var(--pages-accent-7, #818cf8);
      color: var(--pages-accent-11, #3730a3);
    }
    .mode-btn:hover:not(.active) {
      background: var(--pages-neutral-3, #e5e5e5);
    }
    .show-archived-toggle {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      padding: var(--pages-space-1, 4px);
      opacity: 0.5;
      flex-shrink: 0;
    }
    .show-archived-toggle[aria-pressed="true"] {
      opacity: 1;
    }
    .show-archived-toggle:hover { opacity: 0.8; }
  `;

  private _sortedTopics(): QhorusTopic[] {
    return this.topics
      .filter(t => t.state !== 'MERGED')
      .filter(t => t.state !== 'ARCHIVED' || this._showArchived)
      .sort((a, b) => {
        const stateOrder = (s: string) => s === 'ACTIVE' ? 0 : s === 'RESOLVED' ? 1 : 2;
        const diff = stateOrder(a.state) - stateOrder(b.state);
        if (diff !== 0) return diff;
        const aTs = a.latestActivityTs ?? a.createdAt;
        const bTs = b.latestActivityTs ?? b.createdAt;
        return bTs.localeCompare(aTs);
      });
  }

  private _hasArchived(): boolean {
    return this.topics.some(t => t.state === 'ARCHIVED');
  }

  private _onPillClick(topicId: string | null) {
    emitPagesEvent(this, ChannelEventTopics.SELECT_TOPIC, {
      channelId: this.topics[0]?.channelId ?? '',
      topicId,
    });
  }

  private _onModeClick(mode: 'flat' | 'threaded' | 'topics') {
    emitPagesEvent(this, ChannelEventTopics.VIEW_MODE, { mode });
  }

  private _toggleArchived() {
    this._showArchived = !this._showArchived;
  }

  override render() {
    const sorted = this._sortedTopics();
    const channelId = this.topics[0]?.channelId ?? '';

    return html`
      <div class="pills">
        <pages-button class="topic-pill ${this.selectedTopicId === null ? 'active' : ''}"
                @click=${() => this._onPillClick(null)}>
          All
        </pages-button>
        ${sorted.map(t => html`
          <pages-button class="topic-pill ${this.selectedTopicId === t.id ? 'active' : ''} ${t.state === 'RESOLVED' ? 'resolved' : ''} ${t.state === 'ARCHIVED' ? 'archived' : ''}"
                  @click=${() => this._onPillClick(t.id)}>
            ${t.name}
            ${t.messageCount > 0 ? html`<span class="count">${t.messageCount}</span>` : nothing}
          </pages-button>
        `)}
        ${this._hasArchived() ? html`
          <button class="show-archived-toggle"
                  aria-pressed=${this._showArchived ? 'true' : 'false'}
                  aria-label="Show archived topics"
                  @click=${this._toggleArchived}>
            ${this._showArchived ? '👁' : '👁‍🗨'}
          </pages-button>
        ` : nothing}
      </div>
      <pages-button class="mode-btn ${this.viewMode === 'topics' ? 'active' : ''}" variant="ghost" size="sm"
              @click=${() => this._onModeClick(this.viewMode === 'topics' ? 'flat' : 'topics')}
              aria-pressed=${this.viewMode === 'topics' ? 'true' : 'false'}>Topics</pages-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-topic-bar': ChannelTopicBarElement;
  }
}
