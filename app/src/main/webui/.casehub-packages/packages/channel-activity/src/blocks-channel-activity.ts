import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LiveRegionMixin, KeyboardShortcutMixin } from '@casehubio/pages-primitives/a11y';
import { onPagesEvent } from '@casehubio/pages-data';
import type { PushController } from './push-controller.js';
import type { MessagingConfig } from './messaging-controller.js';
import type { ReactionConfig } from './reaction-controller.js';
import { ChannelStateController } from './channel-state-controller.js';
import { MessagingController } from './messaging-controller.js';
import { MembershipController } from './membership-controller.js';
import { ReactionController } from './reaction-controller.js';
import { CommitmentController } from './commitment-controller.js';
import { ChannelEventTopics } from './events.js';
import type {
  QhorusChannel, QhorusMessage, QhorusTopic, ChannelMember,
  PresenceState, Reaction, ActorType, ArtefactRef, MessageType,
} from './types.js';
import type { CommitmentRecord } from '@casehubio/mosaic-core';
import type { ChannelTree } from './channel-state-controller.js';
import './channel-feed.js';
import './channel-nav.js';
import './channel-input.js';
import './channel-topic-bar.js';
import '@casehubio/pages-ui-components/split-workbench';

const Base = KeyboardShortcutMixin(LiveRegionMixin(LitElement));

export interface ChannelActivityProps {
  selectionTopic: string;
  channelNavLayout: 'sidebar' | 'dropdown';
  sidebarOpen: boolean;
  currentActorId?: string;
  autoScroll: boolean;
  staleCursorMinutes: number;
  terminalDimming: boolean;
  eventStyling: boolean;
  viewMode: 'flat' | 'threaded' | 'topics';
  selectedMessageId?: string;
  showTypeSelector: boolean;
  showTopicSelector: boolean;
  showCreate: boolean;
  showDelete: boolean;
}

@customElement('blocks-channel-activity')
export class BlocksChannelActivityElement extends Base {
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'channel';
  @property({ type: String }) channelNavLayout: 'sidebar' | 'dropdown' = 'sidebar';
  @property({ type: Boolean }) sidebarOpen = false;
  @property({ type: String }) currentActorId?: string;

  @property({ attribute: false }) pushController?: PushController;
  @property({ attribute: false }) messagingConfig?: MessagingConfig;
  @property({ attribute: false }) reactionConfig?: ReactionConfig;

  @property({ attribute: false }) channels: QhorusChannel[] = [];
  @property({ attribute: false }) messages: QhorusMessage[] = [];
  @property({ attribute: false }) members: ChannelMember[] = [];
  @property({ attribute: false }) presence: PresenceState[] = [];
  @property({ attribute: false }) reactions: Reaction[] = [];
  @property({ attribute: false }) commitments: Map<string, CommitmentRecord> = new Map();
  @property({ attribute: false }) channelTree?: ChannelTree;
  @property({ attribute: false }) topics: QhorusTopic[] = [];

  @property({ type: Boolean }) autoScroll = true;
  @property({ type: Number }) staleCursorMinutes = 30;
  @property({ type: Boolean }) terminalDimming = true;
  @property({ type: Boolean }) eventStyling = true;
  @property({ type: String }) viewMode: 'flat' | 'threaded' | 'topics' = 'flat';
  @property({ attribute: false }) selectedMessageId?: string;
  @property({ attribute: false }) messageHighlights: Record<string, string> = {};
  @property({ attribute: false }) renderContextHeader?: () => TemplateResult;
  @property({ attribute: false }) renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
  @property({ attribute: false }) formatSender?: (sender: string, actorType: ActorType) => string;

  @property({ type: Boolean }) showTypeSelector = false;
  @property({ type: Boolean }) showTopicSelector = false;
  @property({ attribute: false }) messageTypes?: MessageType[];
  @property({ attribute: false }) allowedTypes?: MessageType[];
  @property({ attribute: false }) deniedTypes?: MessageType[];
  @property({ attribute: false }) renderError?: (error: string) => TemplateResult;

  @property({ type: Boolean }) showCreate = true;
  @property({ type: Boolean }) showDelete = true;

  @property({ attribute: false }) resolveArtifact?: (ref: ArtefactRef) => Promise<unknown>;

  @state() _selectedChannelId = '';
  @state() _selectedChannelName: string | undefined;
  @state() _selectedTopicId: string | null = null;
  @state() _replyTo: { messageId: string; senderName: string } | undefined;
  @state() _activeSidebarTab = 'members';
  @state() _selectedArtefactRef?: ArtefactRef;

  _channels: ChannelStateController | undefined;
  _messaging: MessagingController | undefined;
  _membership: MembershipController | undefined;
  _reactions: ReactionController | undefined;
  _commitmentCtrl: CommitmentController | undefined;
  _unsubs: (() => void)[] = [];
  _sidebarPanels = new Map<string, HTMLElement>();

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Channel activity');
    this.addEventListener('keydown', this._handleKeydown);
  }

  override disconnectedCallback() {
    this.removeEventListener('keydown', this._handleKeydown);
    this._teardownControllers();
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (changed.has('pushController') || changed.has('messagingConfig') || changed.has('reactionConfig')) {
      this._teardownControllers();
      this._setupControllers();
    }
  }

  configure(props: Partial<ChannelActivityProps>) {
    Object.assign(this, props);
    this.requestUpdate();
  }

  private get _navChannels(): QhorusChannel[] {
    return this._channels?.channels ?? this.channels;
  }

  private get _navChannelTree(): ChannelTree | undefined {
    return this._channels?.channelTree ?? this.channelTree;
  }

  private get _feedMessages(): QhorusMessage[] {
    return this._channels?.messages ?? this.messages;
  }

  private get _feedReactions(): Reaction[] {
    return this._reactions?.filteredReactions() ?? this.reactions;
  }

  private get _feedTopics(): QhorusTopic[] {
    return this._channels?.topics ?? this.topics;
  }

  private _setupControllers() {
    const push = this.pushController;
    if (!push) return;
    this._channels = new ChannelStateController(this, push);
    this._membership = new MembershipController(this, push, this._channels);
    this._commitmentCtrl = new CommitmentController(this, push, this._channels);
    if (this.messagingConfig) {
      this._messaging = new MessagingController(this, this._channels, this.messagingConfig);
    }
    if (this.reactionConfig) {
      this._reactions = new ReactionController(this, push, this._channels, this.reactionConfig);
    }
    this._wireEventRouting();
  }

  private _teardownControllers() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    this._channels = undefined;
    this._messaging = undefined;
    this._membership = undefined;
    this._reactions = undefined;
    this._commitmentCtrl = undefined;
  }

  private _wireEventRouting() {
    if (this._channels) {
      this._unsubs.push(
        onPagesEvent(document, ChannelEventTopics.SELECT_CHANNEL, (p: any) => {
          this._channels!.handleEvent(ChannelEventTopics.SELECT_CHANNEL, p);
          this._selectedChannelId = p.channelId;
          this._selectedChannelName = this._channels!.channels.find((c: QhorusChannel) => c.id === p.channelId)?.name;
          this._selectedTopicId = null;
          this._replyTo = undefined;
          this.announce(`Switched to ${this._selectedChannelName ?? p.channelId}`);
        }),
        onPagesEvent(document, ChannelEventTopics.SELECT_TOPIC, (p: any) => {
          this._channels!.handleEvent(ChannelEventTopics.SELECT_TOPIC, p);
          this._selectedTopicId = p.topicId;
        }),
        onPagesEvent(document, ChannelEventTopics.VIEW_MODE, (p: any) => {
          this._channels!.handleEvent(ChannelEventTopics.VIEW_MODE, p);
          this.viewMode = p.mode;
        }),
        onPagesEvent(document, ChannelEventTopics.CREATE_CHANNEL, p => this._channels!.handleEvent(ChannelEventTopics.CREATE_CHANNEL, p)),
        onPagesEvent(document, ChannelEventTopics.DELETE_CHANNEL, p => this._channels!.handleEvent(ChannelEventTopics.DELETE_CHANNEL, p)),
      );
    }
    if (this._messaging) {
      this._unsubs.push(
        onPagesEvent(document, ChannelEventTopics.SEND_MESSAGE, p => this._messaging!.handleEvent(ChannelEventTopics.SEND_MESSAGE, p)),
        onPagesEvent(document, ChannelEventTopics.MESSAGE_SELECTED, (p: any) => {
          this._messaging!.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, p);
          this._replyTo = this._messaging!.replyTo;
          this.selectedMessageId = p.message.id;
        }),
        onPagesEvent(document, ChannelEventTopics.CURSOR_CATCHUP, (p: any) => {
          this._messaging!.handleEvent(ChannelEventTopics.CURSOR_CATCHUP, p);
          this.announce('Catching up on messages');
        }),
        onPagesEvent(document, ChannelEventTopics.CURSOR_RELOAD, (p: any) => {
          this._messaging!.handleEvent(ChannelEventTopics.CURSOR_RELOAD, p);
          this.announce('Reloading messages');
        }),
        onPagesEvent(document, ChannelEventTopics.CREATE_TOPIC, p => this._messaging!.handleEvent(ChannelEventTopics.CREATE_TOPIC, p)),
        onPagesEvent(document, ChannelEventTopics.RESOLVE_TOPIC, p => this._messaging!.handleEvent(ChannelEventTopics.RESOLVE_TOPIC, p)),
        onPagesEvent(document, ChannelEventTopics.REOPEN_TOPIC, p => this._messaging!.handleEvent(ChannelEventTopics.REOPEN_TOPIC, p)),
        onPagesEvent(document, ChannelEventTopics.ARCHIVE_TOPIC, p => this._messaging!.handleEvent(ChannelEventTopics.ARCHIVE_TOPIC, p)),
        onPagesEvent(document, ChannelEventTopics.RENAME_TOPIC, p => this._messaging!.handleEvent(ChannelEventTopics.RENAME_TOPIC, p)),
        onPagesEvent(document, ChannelEventTopics.MERGE_TOPIC, p => this._messaging!.handleEvent(ChannelEventTopics.MERGE_TOPIC, p)),
      );
    }
    if (this._reactions) {
      this._unsubs.push(
        onPagesEvent(document, ChannelEventTopics.REACT, p => this._reactions!.handleEvent(ChannelEventTopics.REACT, p)),
        onPagesEvent(document, ChannelEventTopics.UNREACT, p => this._reactions!.handleEvent(ChannelEventTopics.UNREACT, p)),
      );
    }
    if (this._commitmentCtrl) {
      this._unsubs.push(
        onPagesEvent(document, ChannelEventTopics.MESSAGE_SELECTED, p => this._commitmentCtrl!.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, p)),
      );
    }
    this._unsubs.push(
      onPagesEvent(document, ChannelEventTopics.ARTEFACT_SELECTED, (p: any) => {
        this._selectedArtefactRef = p;
      }),
    );
  }

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      e.preventDefault();
      this.sidebarOpen = !this.sidebarOpen;
      this.announce(this.sidebarOpen ? 'Sidebar opened' : 'Sidebar closed');
    }
    if (e.key === 'Escape') {
      if (this.sidebarOpen) {
        this.sidebarOpen = false;
        this.announce('Sidebar closed');
      }
    }
  };

  private static readonly SIDEBAR_TABS = [
    { id: 'members', label: 'Members', tagName: 'blocks-channel-member-panel' },
    { id: 'tasks', label: 'Tasks', tagName: 'blocks-channel-task-panel' },
    { id: 'artifacts', label: 'Artifacts', tagName: 'blocks-channel-artifact-panel' },
    { id: 'links', label: 'Links', tagName: 'blocks-channel-correlation-panel' },
  ] as const;

  private _renderSidebar(): TemplateResult | typeof nothing {
    return html`
      <div class="sidebar" id="sidebar" ?hidden=${!this.sidebarOpen}>
        <div class="sidebar-tabs" role="tablist" aria-label="Panel tabs">
          ${BlocksChannelActivityElement.SIDEBAR_TABS.map(tab => html`
            <button class="sidebar-tab" role="tab"
              aria-selected=${this._activeSidebarTab === tab.id}
              aria-controls="sidebar-panel-${tab.id}"
              @click=${() => { this._activeSidebarTab = tab.id; this.announce(`${tab.label} tab`); }}>
              ${tab.label}
            </button>
          `)}
        </div>
        <div class="sidebar-content" role="tabpanel"
          id="sidebar-panel-${this._activeSidebarTab}">
          ${this._renderSidebarPanel()}
        </div>
      </div>
    `;
  }

  private _renderSidebarPanel(): TemplateResult {
    const tab = BlocksChannelActivityElement.SIDEBAR_TABS.find(t => t.id === this._activeSidebarTab);
    if (!tab) return html``;
    let panel = this._sidebarPanels.get(tab.id);
    if (!panel) {
      panel = document.createElement(tab.tagName);
      this._sidebarPanels.set(tab.id, panel);
    }
    this._wireSidebarPanel(tab.id, panel);
    return html`${panel}`;
  }

  private _wireSidebarPanel(tabId: string, panel: HTMLElement) {
    const p = panel as any;
    switch (tabId) {
      case 'members':
        p.members = this._membership?.filteredMembers() ?? this.members;
        p.presence = this._membership?.presence ?? this.presence;
        break;
      case 'tasks':
      case 'links':
        p.messages = this._feedMessages;
        p.commitments = this._commitmentCtrl?.commitments ?? this.commitments;
        p.selectedMessageId = this.selectedMessageId;
        break;
      case 'artifacts':
        p.selectedArtefactRef = this._selectedArtefactRef;
        p.resolveArtifact = this.resolveArtifact;
        break;
    }
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
    .detail-area { display: flex; height: 100%; }
    .main-column { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .sidebar { width: 280px; border-left: 1px solid var(--pages-neutral-4, #e0e0e0); display: flex; flex-direction: column; }
    .sidebar[hidden] { display: none; }
    .sidebar-tabs { display: flex; border-bottom: 1px solid var(--pages-neutral-4, #e0e0e0); }
    .sidebar-tab { flex: 1; padding: 8px 4px; text-align: center; cursor: pointer; background: none; border: none; font-size: 12px; color: var(--pages-neutral-11, #555); }
    .sidebar-tab[aria-selected="true"] { color: var(--pages-accent-color, #1a73e8); border-bottom: 2px solid var(--pages-accent-color, #1a73e8); }
    .sidebar-content { flex: 1; overflow-y: auto; }
    .toggle-btn { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--pages-neutral-5, #ccc); background: var(--pages-surface-color, #fff); cursor: pointer; font-size: 12px; color: var(--pages-neutral-12, #333); }
  `;

  override render() {
    return html`
      <pages-split-workbench selection-topic=${this.selectionTopic}>
        <span slot="header">
          <button class="toggle-btn"
            aria-expanded=${this.sidebarOpen}
            aria-controls="sidebar"
            @click=${() => { this.sidebarOpen = !this.sidebarOpen; this.announce(this.sidebarOpen ? 'Sidebar opened' : 'Sidebar closed'); }}>
            ☰ Panels
          </button>
        </span>
        <blocks-channel-nav slot="list"
          .channels=${this._navChannels}
          .channelTree=${this._navChannelTree}
          .layout=${this.channelNavLayout}
          .selectedChannelId=${this._selectedChannelId}
          .showCreate=${this.showCreate}
          .showDelete=${this.showDelete}>
        </blocks-channel-nav>
        <div slot="detail" class="detail-area">
          <div class="main-column">
            <blocks-channel-topic-bar
              .topics=${this._feedTopics}
              .selectedTopicId=${this._selectedTopicId}
              .viewMode=${this.viewMode}>
            </blocks-channel-topic-bar>
            <blocks-channel-feed
              .messages=${this._feedMessages}
              .reactions=${this._feedReactions}
              .channelId=${this._selectedChannelId}
              .channelName=${this._selectedChannelName}
              .currentActorId=${this.currentActorId}
              .autoScroll=${this.autoScroll}
              .staleCursorMinutes=${this.staleCursorMinutes}
              .terminalDimming=${this.terminalDimming}
              .eventStyling=${this.eventStyling}
              .viewMode=${this.viewMode}
              .topics=${this._feedTopics}
              .selectedMessageId=${this.selectedMessageId}
              .messageHighlights=${this.messageHighlights}
              .renderContextHeader=${this.renderContextHeader}
              .renderContent=${this.renderContent}
              .formatSender=${this.formatSender}>
            </blocks-channel-feed>
            <blocks-channel-input
              .channelId=${this._selectedChannelId}
              .replyTo=${this._replyTo}
              .showTypeSelector=${this.showTypeSelector}
              .showTopicSelector=${this.showTopicSelector}
              .topics=${this._feedTopics}
              .topicId=${this._selectedTopicId ?? ''}
              .messageTypes=${this.messageTypes ?? []}
              .allowedTypes=${this.allowedTypes}
              .deniedTypes=${this.deniedTypes}
              .renderError=${this.renderError}>
            </blocks-channel-input>
          </div>
          ${this._renderSidebar()}
        </div>
      </pages-split-workbench>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'blocks-channel-activity': BlocksChannelActivityElement; }
}
