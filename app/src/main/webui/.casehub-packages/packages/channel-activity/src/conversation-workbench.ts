import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SwipeController } from './swipe-controller.js';
import { MQ_TABLET, MQ_DESKTOP } from './responsive.js';
import {
  ChannelEventTopics,
  PushController, ALL_TOPICS,
  ChannelStateController,
  MessagingController,
  MembershipController,
  ReactionController,
  CommitmentController,
  ChannelFeedElement,
  ChannelNavElement,
  ChannelMemberPanelElement,
  ChannelInputElement,
  ChannelTopicBarElement,
  ChannelTaskPanelElement,
  ChannelCorrelationPanelElement,
  ChannelArtifactPanelElement,
} from './index.js';
import type {
  SendMessagePayload, ArtefactRef, QhorusChannel,
  CreateSpacePayload, RenameSpacePayload, DeleteSpacePayload, MoveChannelToSpacePayload,
} from './index.js';
import type { ConnectionStatus } from './push-controller.js';

void ChannelFeedElement; void ChannelNavElement; void ChannelMemberPanelElement;
void ChannelInputElement; void ChannelTopicBarElement;
void ChannelTaskPanelElement; void ChannelCorrelationPanelElement; void ChannelArtifactPanelElement;

export interface LayoutState {
  splits: Record<string, number>;
  docks: Record<string, boolean>;
  panels: Record<string, unknown>;
}

export interface PushConnection {
  close(): void;
}

export interface ConnectPushOptions {
  onOp: (op: unknown) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  topics: string[];
}

export interface ConversationWorkbenchConfig {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  currentActorId: string;
  restBase: string;
  connectPush: (options: ConnectPushOptions) => PushConnection;
  channelFilter?: (channel: QhorusChannel) => boolean;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  markRead?: (channelId: string, lastReadMessageId: string) => Promise<void>;
  createSpace?: (name: string) => Promise<void>;
  renameSpace?: (spaceId: string, newName: string) => Promise<void>;
  deleteSpace?: (spaceId: string) => Promise<void>;
  moveChannelToSpace?: (channelId: string, spaceId: string, position?: number) => Promise<void>;
  correctMessage?: (channelId: string, messageId: string, content: string) => Promise<void>;
  retractMessage?: (channelId: string, messageId: string, reason?: string) => Promise<void>;
  layoutStore?: {
    load(key: string): Promise<LayoutState | null>;
    save(key: string, state: LayoutState): Promise<void>;
  };
}

const ICON_CHAT = html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_PEOPLE = html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const ICON_CHECKLIST = html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
const ICON_LINK = html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const ICON_PAPERCLIP = html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;

type LayoutMode = 'desktop' | 'tablet' | 'phone';

@customElement('agency-conversation-workbench')
export class ConversationWorkbenchElement extends LitElement {
  @property({ type: Object }) config!: ConversationWorkbenchConfig;

  private _push = new PushController(this);
  private _channels = new ChannelStateController(this, this._push);
  private _messaging = new MessagingController(this, this._channels, {
    restBase: () => this.config?.restBase ?? '',
    fetch: (input: string | URL | Request, init?: RequestInit) => this.config?.fetch?.(String(input), init) ?? fetch(input, init),
  });
  private _members = new MembershipController(this, this._push, this._channels);
  private _reactions = new ReactionController(this, this._push, this._channels, {
    restBase: () => this.config?.restBase ?? '',
    fetch: (input: string | URL | Request, init?: RequestInit) => this.config?.fetch?.(String(input), init) ?? fetch(input, init),
  });
  private _commitments = new CommitmentController(this, this._push, this._channels);

  @state() private _layoutState: LayoutState = {
    splits: {},
    docks: { nav: true, members: true, tasks: false, correlation: false, artifacts: false },
    panels: {},
  };
  @state() private _mode: LayoutMode = 'desktop';
  @state() private _tabletTab = 'nav';
  @state() private _drawerOpen: string | null = null;
  @state() private _compactDensity = false;
  @state() private _navWidth = 240;
  @state() private _memberWidth = 220;
  @state() private _selectedArtefactRef?: ArtefactRef;

  private static readonly DOCK_ITEMS = [
    { icon: ICON_CHAT, label: 'Channels', panelId: 'nav', defaultOpen: true },
    { icon: ICON_PEOPLE, label: 'Members', panelId: 'members', defaultOpen: true },
    { icon: ICON_CHECKLIST, label: 'Tasks', panelId: 'tasks', defaultOpen: false },
    { icon: ICON_LINK, label: 'Correlation', panelId: 'correlation', defaultOpen: false },
    { icon: ICON_PAPERCLIP, label: 'Artifacts', panelId: 'artifacts', defaultOpen: false },
  ];

  private _swipeController = new SwipeController(this, {
    drawerQuery: (side) => this.renderRoot?.querySelector(side === 'left' ? '.drawer.left' : '.drawer.right') as HTMLElement | null,
    backdropQuery: () => this.renderRoot?.querySelector('.backdrop') as HTMLElement | null,
    onOpen: (side) => { this._toggleDock(side === 'left' ? 'nav' : 'members'); },
    onClose: () => { this._drawerOpen = null; },
    isOpenQuery: (side) => side === 'left' ? this._drawerOpen === 'nav' : this._drawerOpen === 'members',
  });
  private _pushConn?: PushConnection;
  private _mqTablet?: MediaQueryList;
  private _mqDesktop?: MediaQueryList;

  static override readonly styles = css`
    :host { display: flex; height: 100%; overflow: hidden; font-family: var(--pages-font-family, 'Inter', system-ui, sans-serif); background: var(--pages-neutral-1); color: var(--pages-neutral-12); }
    .nav-panel { flex-shrink: 0; border-right: 1px solid var(--pages-neutral-4); overflow-y: auto; }
    .main-panel { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    .member-panel { flex-shrink: 0; border-left: 1px solid var(--pages-neutral-4); overflow-y: auto; }
    agency-channel-feed { flex: 1; min-height: 0; overflow-y: auto; }
    agency-channel-input { flex-shrink: 0; }
    .dock-strip { display: flex; flex-direction: column; width: 40px; flex-shrink: 0; background: var(--pages-neutral-2); border-right: 1px solid var(--pages-neutral-4); padding: 6px 0; gap: 2px; align-items: center; }
    .dock-strip .spacer { flex: 1; }
    .dock-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 6px; cursor: pointer; color: var(--pages-neutral-9); }
    .dock-btn svg { width: 20px; height: 20px; }
    .dock-btn:hover { background: var(--pages-neutral-3); color: var(--pages-neutral-11); }
    .dock-btn.active { color: var(--pages-accent-9); background: var(--pages-neutral-3); }
    .phone-header { display: flex; align-items: center; height: 40px; padding: 0 4px; border-bottom: 1px solid var(--pages-neutral-4); flex-shrink: 0; gap: 2px; }
    .phone-header .spacer { flex: 1; }
    .phone-header .channel-name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sidebar-with-tabs { display: flex; flex-direction: column; width: 280px; flex-shrink: 0; border-right: 1px solid var(--pages-neutral-4); overflow-y: auto; }
    .tab-switcher { display: flex; flex-wrap: wrap; gap: var(--pages-space-1, 4px); padding: var(--pages-space-2, 8px); flex-shrink: 0; }
    .tab-switcher button { display: inline-flex; align-items: center; gap: var(--pages-space-1, 4px); padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px); font-size: var(--pages-font-size-xs, 11px); font-weight: 600; background: var(--pages-neutral-1); color: var(--pages-neutral-11); border: 1px solid var(--pages-neutral-5); border-radius: var(--pages-radius-full, 9999px); cursor: pointer; white-space: nowrap; transition: background 0.15s, border-color 0.15s; }
    .tab-switcher button:hover { background: var(--pages-neutral-3); }
    .tab-switcher button.active { background: var(--pages-accent-3); border-color: var(--pages-accent-7); color: var(--pages-accent-11); }
    .tab-count { background: var(--pages-neutral-4); border-radius: var(--pages-radius-full, 9999px); padding: 0 var(--pages-space-1, 4px); font-size: var(--pages-font-size-xs, 11px); min-width: 16px; text-align: center; }
    .tab-switcher button.active .tab-count { background: var(--pages-accent-5); }
    .sidebar-content { flex: 1; min-height: 0; overflow-y: auto; }
    .drawer { position: fixed; top: 0; bottom: 0; width: 280px; background: var(--pages-neutral-1); z-index: 50; overflow-y: auto; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--pages-shadow-2, 2px 0 8px rgba(0,0,0,0.15)); }
    .drawer.left { left: 0; transform: translateX(-100%); }
    .drawer.left.open { transform: translateX(0); }
    .drawer.right { right: 0; transform: translateX(100%); }
    .drawer.right.open { transform: translateX(0); }
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
    .backdrop.visible { opacity: 1; pointer-events: auto; }
    @media (prefers-reduced-motion: reduce) { .drawer, .backdrop { transition-duration: 0ms !important; } }
    .connection-banner { display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 12px; font-weight: 500; flex-shrink: 0; }
    .connection-banner.reconnecting { background: var(--pages-warning-3); color: var(--pages-warning-11); }
    .connection-banner.disconnected { background: var(--pages-danger-3); color: var(--pages-danger-11); }
    .connection-spinner { width: 12px; height: 12px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .settings-panel { padding: 16px; }
    .settings-heading { margin: 0 0 16px; font-size: 14px; font-weight: 600; }
    .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px; cursor: pointer; }
    .drag-handle { width: 4px; cursor: col-resize; background: transparent; flex-shrink: 0; transition: background 0.15s; }
    .drag-handle:hover { background: var(--pages-accent-7); }
    .drag-handle:active { background: var(--pages-accent-9); }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('pages-event', this._onChatEvent as EventListener);
    this._setupMediaQueries();
    this._loadLayout();
  }

  private async _loadLayout() {
    if (!this.config?.layoutStore) return;
    const saved = await this.config.layoutStore.load('workbench');
    if (saved) {
      this._layoutState = saved;
      this._compactDensity = !!(saved.panels as Record<string, unknown>)?.compactDensity;
      if (this._compactDensity) this.classList.add('pages-density-compact');
      if (saved.splits) {
        if (typeof saved.splits.nav === 'number') this._navWidth = saved.splits.nav;
        if (typeof saved.splits.member === 'number') this._memberWidth = saved.splits.member;
      }
    }
  }

  override firstUpdated() {
    if (this.config?.connectPush) {
      this._pushConn = this.config.connectPush({
        onOp: (op: unknown) => { this._push.applyOp(op as any); },
        onStatusChange: (status: ConnectionStatus) => { this._push.setConnectionStatus(status); },
        topics: ALL_TOPICS,
      });
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('pages-event', this._onChatEvent as EventListener);
    this._pushConn?.close();
    this._mqTablet?.removeEventListener('change', this._onMediaChange);
    this._mqDesktop?.removeEventListener('change', this._onMediaChange);
  }

  private _setupMediaQueries() {
    this._mqTablet = window.matchMedia(MQ_TABLET);
    this._mqDesktop = window.matchMedia(MQ_DESKTOP);
    this._mqTablet.addEventListener('change', this._onMediaChange);
    this._mqDesktop.addEventListener('change', this._onMediaChange);
    this._updateMode();
  }

  private _onMediaChange = () => this._updateMode();

  private _updateMode() {
    const prev = this._mode;
    if (this._mqDesktop?.matches) this._mode = 'desktop';
    else if (this._mqTablet?.matches) this._mode = 'tablet';
    else this._mode = 'phone';
    if (prev !== this._mode) this._drawerOpen = null;
  }

  private _toggleDock(panelId: string) {
    if (this._mode === 'phone') {
      this._drawerOpen = this._drawerOpen === panelId ? null : panelId;
    } else if (this._mode === 'tablet') {
      this._tabletTab = this._tabletTab === panelId ? '' : panelId;
    } else {
      this._layoutState = { ...this._layoutState, docks: { ...this._layoutState.docks, [panelId]: !this._layoutState.docks[panelId] } };
      this._saveLayout();
    }
  }

  private _isDockOpen(panelId: string): boolean { return !!this._layoutState.docks[panelId]; }

  private _closeDrawer() { this._drawerOpen = null; }

  private _saveLayout() { this.config?.layoutStore?.save('workbench', this._layoutState); }

  private _onDragStart(panel: 'nav' | 'member', e: PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = panel === 'nav' ? this._navWidth : this._memberWidth;
    const minW = 180;
    const maxW = panel === 'nav' ? 360 : 300;
    const onMove = (me: PointerEvent) => {
      const delta = panel === 'nav' ? me.clientX - startX : startX - me.clientX;
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
      if (panel === 'nav') this._navWidth = newWidth; else this._memberWidth = newWidth;
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      this._layoutState = { ...this._layoutState, splits: { ...this._layoutState.splits, [panel]: panel === 'nav' ? this._navWidth : this._memberWidth } };
      this._saveLayout();
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  }

  private _filteredChannels(): QhorusChannel[] {
    const all = this._channels.channels;
    return this.config?.channelFilter ? all.filter(this.config.channelFilter) : all;
  }

  private _onChatEvent = (e: CustomEvent) => {
    const { topic, payload } = e.detail;
    if (topic === ChannelEventTopics.SEND_MESSAGE) {
      this._sendMessage(payload as SendMessagePayload);
    } else {
      this._channels.handleEvent(topic, payload);
      this._messaging.handleEvent(topic, payload);
      this._reactions.handleEvent(topic, payload);
      this._commitments.handleEvent(topic, payload);
    }
    if (topic === ChannelEventTopics.ARTEFACT_SELECTED) {
      this._selectedArtefactRef = (payload as { artefactRef: ArtefactRef }).artefactRef;
      if (!this._isDockOpen('artifacts') && this._mode === 'desktop') {
        this._layoutState = { ...this._layoutState, docks: { ...this._layoutState.docks, artifacts: true } };
        this._saveLayout();
      }
    }
    if (topic === ChannelEventTopics.SELECT_CHANNEL) {
      if (this._mode === 'phone') this._drawerOpen = null;
      const { channelId } = payload as { channelId: string };
      const latestId = this._channels.latestMessageId(channelId);
      if (latestId) this.config?.markRead?.(channelId, latestId);
    }
    if (topic === ChannelEventTopics.CREATE_SPACE && this.config?.createSpace) {
      const { name } = payload as CreateSpacePayload;
      this.config.createSpace(name).catch((err: unknown) => console.error('Create space failed:', err));
    }
    if (topic === ChannelEventTopics.RENAME_SPACE && this.config?.renameSpace) {
      const { spaceId, newName } = payload as RenameSpacePayload;
      this.config.renameSpace(spaceId, newName).catch((err: unknown) => console.error('Rename space failed:', err));
    }
    if (topic === ChannelEventTopics.DELETE_SPACE && this.config?.deleteSpace) {
      const { spaceId } = payload as DeleteSpacePayload;
      this.config.deleteSpace(spaceId).catch((err: unknown) => console.error('Delete space failed:', err));
    }
    if (topic === ChannelEventTopics.MOVE_CHANNEL_TO_SPACE && this.config?.moveChannelToSpace) {
      const { channelId, spaceId, position } = payload as MoveChannelToSpacePayload;
      const spaceNode = this._channels.channelTree.spaces.find(s => s.space.id === spaceId);
      this._channels.applyMoveChannel(channelId, spaceId, spaceNode?.space.name ?? null, position);
      if (spaceId != null) this.config.moveChannelToSpace(channelId, spaceId, position).catch((err: unknown) => console.error('Move channel failed:', err));
    }
    if (topic === ChannelEventTopics.CORRECT_MESSAGE && this.config?.correctMessage) {
      const { messageId, correctedContent } = payload as { messageId: string; correctedContent: string };
      const channelId = this._channels.selectedChannelId;
      if (channelId && messageId) this.config.correctMessage(channelId, messageId, correctedContent).catch((err: unknown) => console.error('Correction failed:', err));
    }
    if (topic === ChannelEventTopics.RETRACT_MESSAGE && this.config?.retractMessage) {
      const { messageId, reason } = payload as { messageId: string; reason?: string };
      const channelId = this._channels.selectedChannelId;
      if (channelId && messageId) this.config.retractMessage(channelId, messageId, reason).catch((err: unknown) => console.error('Retraction failed:', err));
    }
  };

  private async _sendMessage(payload: SendMessagePayload) {
    try {
      await this.config.sendMessage(payload);
      this._messaging.replyTo = undefined;
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  override willUpdate() {
    if (!this._channels.selectedChannelId && this._channels.channels.length > 0) {
      this._channels.selectedChannelId = this._channels.channels[0]!.id;
    }
  }

  private _renderNav() {
    return html`<agency-channel-nav .channelTree=${this._channels.channelTree} .selectedChannelId=${this._channels.selectedChannelId}></agency-channel-nav>`;
  }

  private _renderMembers() {
    return html`<agency-channel-member-panel .members=${this._members.filteredMembers()} .presence=${this._members.presence}></agency-channel-member-panel>`;
  }

  private _renderConnectionBanner() {
    if (this._push.connectionStatus === 'connected') return nothing;
    if (this._push.connectionStatus === 'reconnecting') return html`<div class="connection-banner reconnecting"><span class="connection-spinner"></span>Reconnecting...</div>`;
    return html`<div class="connection-banner disconnected">Connection lost</div>`;
  }

  private _renderChat() {
    const channelTopics = this._channels.channelTopics();
    const showTopics = channelTopics.length > 1;
    const selectedTopic = channelTopics.find(t => t.id === this._channels.selectedTopicId);
    const defaultTopic = channelTopics.find(t => t.name === 'General');
    const currentTopic = selectedTopic ?? defaultTopic;
    return html`
      ${this._renderConnectionBanner()}
      ${showTopics ? html`<agency-channel-topic-bar .topics=${channelTopics} .selectedTopicId=${this._channels.selectedTopicId} .viewMode=${this._channels.viewMode}></agency-channel-topic-bar>` : nothing}
      <agency-channel-feed .messages=${this._channels.filteredMessages()} .reactions=${this._reactions.filteredReactions()} .eventStyling=${false} .viewMode=${this._channels.viewMode} .topics=${channelTopics} .selectedMessageId=${this._commitments.selectedMessageId} .channelName=${this._channels.channels.find(c => c.id === this._channels.selectedChannelId)?.name} .currentActorId=${this.config?.currentActorId ?? ''}></agency-channel-feed>
      <agency-channel-input .channelId=${this._channels.selectedChannelId} .replyTo=${this._messaging.replyTo} .showTopicSelector=${showTopics} .topic=${currentTopic?.name ?? 'General'} .topicId=${currentTopic?.id ?? ''} .topics=${channelTopics}></agency-channel-input>
    `;
  }

  private _renderDockStrip() {
    return html`<div class="dock-strip">${ConversationWorkbenchElement.DOCK_ITEMS.map(item => html`<button class="dock-btn ${this._isDockOpen(item.panelId) ? 'active' : ''}" title=${item.label} aria-label=${item.label} @click=${() => this._toggleDock(item.panelId)}>${item.icon}</button>`)}<span class="spacer"></span></div>`;
  }

  private _renderPanel(panelId: string) {
    switch (panelId) {
      case 'nav': return this._renderNav();
      case 'members': return this._renderMembers();
      case 'tasks': return html`<agency-channel-task-panel .messages=${this._channels.filteredMessages()} .commitments=${this._commitments.commitments} .selectedMessageId=${this._commitments.selectedMessageId}></agency-channel-task-panel>`;
      case 'correlation': return html`<agency-channel-correlation-panel .messages=${this._channels.filteredMessages()} .commitments=${this._commitments.commitments} .selectedMessageId=${this._commitments.selectedMessageId}></agency-channel-correlation-panel>`;
      case 'artifacts': return html`<agency-channel-artifact-panel .selectedArtefactRef=${this._selectedArtefactRef}></agency-channel-artifact-panel>`;
      case 'settings': return this._renderSettings();
      default: return nothing;
    }
  }

  private _renderSettings() {
    return html`<div class="settings-panel"><h3 class="settings-heading">Settings</h3><label class="settings-row"><span>Compact density</span><input type="checkbox" .checked=${this._compactDensity} @change=${(e: Event) => { this._compactDensity = (e.target as HTMLInputElement).checked; if (this._compactDensity) this.classList.add('pages-density-compact'); else this.classList.remove('pages-density-compact'); this._layoutState = { ...this._layoutState, panels: { ...this._layoutState.panels, compactDensity: this._compactDensity } }; this._saveLayout(); }} /></label></div>`;
  }

  override render() {
    if (this._mode === 'phone') return this._renderPhone();
    if (this._mode === 'tablet') return this._renderTablet();
    return this._renderDesktop();
  }

  private _renderDesktop() {
    const leftPanels = ['nav', 'tasks'].filter(p => this._isDockOpen(p));
    const rightPanels = ['members', 'correlation', 'artifacts', 'settings'].filter(p => this._isDockOpen(p));
    return html`
      ${this._renderDockStrip()}
      ${leftPanels.map(p => html`<div class="nav-panel" style="width:${this._navWidth}px">${this._renderPanel(p)}</div>`)}
      ${leftPanels.length > 0 ? html`<div class="drag-handle" @pointerdown=${(e: PointerEvent) => this._onDragStart('nav', e)} @dblclick=${() => { this._navWidth = 240; this._layoutState = { ...this._layoutState, splits: { ...this._layoutState.splits, nav: 240 } }; this._saveLayout(); }}></div>` : nothing}
      <div class="main-panel">${this._renderChat()}</div>
      ${rightPanels.length > 0 ? html`<div class="drag-handle" @pointerdown=${(e: PointerEvent) => this._onDragStart('member', e)} @dblclick=${() => { this._memberWidth = 220; this._layoutState = { ...this._layoutState, splits: { ...this._layoutState.splits, member: 220 } }; this._saveLayout(); }}></div>` : nothing}
      ${rightPanels.map(p => html`<div class="member-panel" style="width:${this._memberWidth}px">${this._renderPanel(p)}</div>`)}
    `;
  }

  private _tabletCount(panelId: string): number {
    switch (panelId) {
      case 'nav': return this._filteredChannels().length;
      case 'members': return this._members.filteredMembers().length;
      default: return 0;
    }
  }

  private _renderTablet() {
    const tabItems = [{ id: 'nav', label: 'Chans' }, { id: 'members', label: 'Mbrs' }, { id: 'tasks', label: 'Tasks' }, { id: 'correlation', label: 'Corr' }, { id: 'artifacts', label: 'Arts' }];
    return html`
      <div class="sidebar-with-tabs">
        <div class="tab-switcher">${tabItems.map(t => { const count = this._tabletCount(t.id); return html`<button class=${this._tabletTab === t.id ? 'active' : ''} @click=${() => { this._tabletTab = t.id; }}>${t.label}${count > 0 ? html`<span class="tab-count">${count}</span>` : nothing}</button>`; })}</div>
        <div class="sidebar-content">${this._tabletTab ? this._renderPanel(this._tabletTab) : nothing}</div>
      </div>
      <div class="main-panel">${this._renderChat()}</div>
    `;
  }

  private _renderPhone() {
    const channelName = this._channels.channels.find(c => c.id === this._channels.selectedChannelId)?.name;
    return html`
      <div class="drawer left ${this._drawerOpen === 'nav' ? 'open' : ''}">${this._renderNav()}</div>
      <div class="drawer right ${this._drawerOpen && this._drawerOpen !== 'nav' ? 'open' : ''}">${this._drawerOpen && this._drawerOpen !== 'nav' ? this._renderPanel(this._drawerOpen) : nothing}</div>
      <div class="backdrop ${this._drawerOpen ? 'visible' : ''}" @click=${this._closeDrawer}></div>
      <div class="main-panel" ?inert=${!!this._drawerOpen}>
        <div class="phone-header">
          <button class="dock-btn" title="Channels" aria-label="Channels" @click=${() => this._toggleDock('nav')}>☰</button>
          ${channelName ? html`<span class="channel-name">#${channelName}</span>` : nothing}
          <span class="spacer"></span>
          <button class="dock-btn" title="Members" aria-label="Members" @click=${() => this._toggleDock('members')}>${ICON_PEOPLE}</button>
          <button class="dock-btn" title="More" aria-label="More" @click=${() => this._toggleDock('tasks')}>⋯</button>
        </div>
        ${this._renderChat()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-conversation-workbench': ConversationWorkbenchElement;
  }
}
