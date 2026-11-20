import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController, DatasetOp } from './push-controller.js';
import type { QhorusChannel, QhorusMessage, QhorusTopic, ArtefactRef, MessageType, ActorType, TopicState } from './types.js';
import { ChannelEventTopics } from './events.js';
import type { SelectChannelPayload, SelectTopicPayload, ViewModePayload } from './events.js';

export interface Space {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly parentSpaceId?: string;
}

export interface SpaceNode {
  readonly space: Space;
  readonly channels: QhorusChannel[];
  readonly unreadCount: number;
  readonly children: SpaceNode[];
}

export interface ChannelTree {
  readonly spaces: SpaceNode[];
  readonly ungrouped: QhorusChannel[];
}

export class ChannelStateController implements ReactiveController {
  channels: QhorusChannel[] = [];
  topics: QhorusTopic[] = [];
  messages: QhorusMessage[] = [];
  selectedChannelId = '';
  selectedTopicId: string | null = null;
  viewMode: 'flat' | 'threaded' | 'topics' = 'flat';

  private _host: ReactiveControllerHost;
  private _currentUserId = '';
  private _pendingSpaces: Space[] = [];

  constructor(host: ReactiveControllerHost, push: PushController) {
    this._host = host;
    host.addController(this);
    push.registerDatasetHandler('channels', (op) => { this._applyChannels(op); this._host.requestUpdate(); });
    push.registerDatasetHandler('topics', (op) => { this._applyTopics(op); this._host.requestUpdate(); });
    push.registerDatasetHandler('messages', (op) => { this._applyMessages(op); this._host.requestUpdate(); });
  }

  addPendingSpace(space: Space) {
    this._pendingSpaces = [...this._pendingSpaces, space];
    this._host.requestUpdate();
  }

  removePendingSpace(spaceId: string) {
    this._pendingSpaces = this._pendingSpaces.filter(s => s.id !== spaceId);
    this._host.requestUpdate();
  }

  applyRenameSpace(spaceId: string, newName: string) {
    this.channels = this.channels.map(ch =>
      ch.spaceId === spaceId ? { ...ch, spaceName: newName } : ch
    );
    this._pendingSpaces = this._pendingSpaces.map(s =>
      s.id === spaceId ? { ...s, name: newName } : s
    );
    this._host.requestUpdate();
  }

  applyMoveChannel(channelId: string, spaceId: string | null, spaceName: string | null, position?: number) {
    const channel = this.channels.find(ch => ch.id === channelId);
    if (!channel) return;

    let moved: QhorusChannel;
    if (spaceId) {
      moved = { ...channel, spaceId, spaceName: spaceName ?? undefined } as QhorusChannel;
    } else {
      const { spaceId: _, spaceName: _s, parentSpaceId: _p, ...rest } = channel;
      moved = rest as QhorusChannel;
    }

    const siblings = this.channels
      .filter(ch => ch.id !== channelId && (spaceId ? ch.spaceId === spaceId : !ch.spaceId))
      .sort((a, b) => {
        const oa = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const ob = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
      });

    const pos = Math.min(position ?? siblings.length, siblings.length);
    siblings.splice(pos, 0, moved);

    const reordered = new Map(siblings.map((ch, i) => [ch.id, i]));

    this.channels = this.channels.map(ch => {
      const newOrder = reordered.get(ch.id);
      if (newOrder !== undefined) {
        return ch.id === channelId
          ? { ...moved, displayOrder: newOrder } as QhorusChannel
          : { ...ch, displayOrder: newOrder };
      }
      return ch;
    });
    this._host.requestUpdate();
  }

  applyDeleteSpace(spaceId: string) {
    this.channels = this.channels.map(ch => {
      if (ch.spaceId !== spaceId) return ch;
      const { spaceId: _, spaceName: _s, parentSpaceId: _p, ...rest } = ch;
      return rest as typeof ch;
    });
    this.removePendingSpace(spaceId);
  }

  get channelTree(): ChannelTree {
    const spaceMap = new Map<string, { space: Space; channels: QhorusChannel[]; children: SpaceNode[] }>();
    const ungrouped: QhorusChannel[] = [];

    for (const ch of this.channels) {
      if (ch.spaceId && ch.spaceName) {
        let node = spaceMap.get(ch.spaceId);
        if (!node) {
          const space: Space = { id: ch.spaceId, name: ch.spaceName };
          if (ch.parentSpaceId) (space as { parentSpaceId: string }).parentSpaceId = ch.parentSpaceId;
          node = { space, channels: [], children: [] };
          spaceMap.set(ch.spaceId, node);
        }
        node.channels.push(ch);
      } else {
        ungrouped.push(ch);
      }
    }

    const roots: SpaceNode[] = [];
    for (const node of spaceMap.values()) {
      const parentId = node.space.parentSpaceId;
      const channelUnread = node.channels.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0);
      if (parentId) {
        const parent = spaceMap.get(parentId);
        if (parent) {
          parent.children.push({ ...node, unreadCount: channelUnread });
          continue;
        }
      }
      roots.push({ ...node, unreadCount: channelUnread });
    }
    for (const root of roots) {
      const childrenUnread = root.children.reduce((sum, child) => sum + child.unreadCount, 0);
      (root as { unreadCount: number }).unreadCount += childrenUnread;
    }

    for (const ps of this._pendingSpaces) {
      if (!spaceMap.has(ps.id)) {
        roots.push({ space: ps, channels: [], unreadCount: 0, children: [] });
      }
    }

    const sortByOrder = (a: QhorusChannel, b: QhorusChannel) => {
      const oa = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const ob = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name);
    };
    for (const node of spaceMap.values()) {
      node.channels.sort(sortByOrder);
    }
    ungrouped.sort(sortByOrder);

    return { spaces: roots, ungrouped };
  }

  filteredMessages(): QhorusMessage[] {
    if (!this.selectedChannelId) return [];
    let msgs = this.messages.filter(m => m.channelId === this.selectedChannelId);
    if (this.selectedTopicId) {
      msgs = msgs.filter(m => m.topicId === this.selectedTopicId);
    }
    return msgs;
  }

  channelTopics(): QhorusTopic[] {
    if (!this.selectedChannelId) return [];
    return this.topics.filter(t => t.channelId === this.selectedChannelId && t.state !== 'MERGED');
  }

  handleEvent(topic: string, payload: unknown) {
    switch (topic) {
      case ChannelEventTopics.SELECT_CHANNEL: {
        const { channelId } = payload as SelectChannelPayload;
        this.selectedChannelId = channelId;
        this.selectedTopicId = null;
        this.channels = this.channels.map(ch =>
          ch.id === channelId && (ch.unreadCount ?? 0) > 0 ? { ...ch, unreadCount: 0 } : ch
        );
        this._host.requestUpdate();
        break;
      }
      case ChannelEventTopics.VIEW_MODE: {
        this.viewMode = (payload as ViewModePayload).mode;
        this._host.requestUpdate();
        break;
      }
      case ChannelEventTopics.SELECT_TOPIC: {
        this.selectedTopicId = (payload as SelectTopicPayload).topicId;
        this._host.requestUpdate();
        break;
      }
    }
  }

  private _applyChannels(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.channels = (op.rows ?? []).map(r => this._toChannel(r));
      const channelSpaceIds = new Set(this.channels.filter(ch => ch.spaceId).map(ch => ch.spaceId!));
      this._pendingSpaces = this._pendingSpaces.filter(s => !channelSpaceIds.has(s.id));
    } else if (op.op === 'append' && op.rows) {
      this.channels = [...this.channels, ...op.rows.map(r => this._toChannel(r))];
    } else if (op.op === 'replace' && op.row && op.key) {
      const existing = this.channels.find(c => c.id === op.key);
      const updated = this._toChannel(op.row);
      this.channels = this.channels.map(c =>
        c.id === op.key
          ? { ...updated, unreadCount: existing?.unreadCount ?? updated.unreadCount ?? 0 }
          : c);
    } else if (op.op === 'remove' && op.key) {
      this.channels = this.channels.filter(c => c.id !== op.key);
    }
  }

  private _toChannel(row: unknown[]): QhorusChannel {
    const ch: QhorusChannel = { id: row[0] as string, name: row[1] as string, semantic: 'APPEND', paused: false, unreadCount: 0 };
    const desc = row[3] as string;
    const spaceId = row[5] as string;
    const spaceName = row[6] as string;
    const parentSpaceId = row[7] as string;
    const displayOrder = row[8] as string;
    const unreadCount = row[9] as string;
    if (desc) (ch as { description: string }).description = desc;
    if (spaceId) (ch as { spaceId: string }).spaceId = spaceId;
    if (spaceName) (ch as { spaceName: string }).spaceName = spaceName;
    if (parentSpaceId) (ch as { parentSpaceId: string }).parentSpaceId = parentSpaceId;
    if (displayOrder) (ch as { displayOrder: number }).displayOrder = parseInt(displayOrder, 10);
    if (unreadCount) (ch as { unreadCount: number }).unreadCount = parseInt(unreadCount, 10) || 0;
    return ch;
  }

  private _applyTopics(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.topics = (op.rows ?? []).map(r => this._toTopic(r));
    } else if (op.op === 'append' && op.rows) {
      this.topics = [...this.topics, ...op.rows.map(r => this._toTopic(r))];
    } else if (op.op === 'replace' && op.row && op.key) {
      this.topics = this.topics.map(t => t.id === op.key ? this._toTopic(op.row!) : t);
    } else if (op.op === 'remove' && op.key) {
      this.topics = this.topics.filter(t => t.id !== op.key);
    }
  }

  private _toTopic(row: unknown[]): QhorusTopic {
    const t: QhorusTopic = {
      id: row[0] as string, channelId: row[1] as string, name: row[2] as string,
      state: row[3] as TopicState, messageCount: Number(row[4]) || 0, createdAt: row[6] as string,
    };
    const latest = row[5] as string;
    if (latest) (t as { latestActivityTs: string }).latestActivityTs = latest;
    return t;
  }

  private _resolveTopicName(topicId: string | null | undefined): string {
    if (!topicId) return '';
    const topic = this.topics.find(t => t.id === topicId);
    return topic?.name ?? '';
  }

  private _applyMessages(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.messages = (op.rows ?? []).map(r => this._toMessage(r));
    } else if (op.op === 'append' && op.rows) {
      const newMsgs = op.rows.map(r => this._toMessage(r));
      this.messages = [...this.messages, ...newMsgs];
      this._trackUnread(newMsgs);
    } else if (op.op === 'remove' && op.key) {
      this.messages = this.messages.filter(m => m.id !== op.key);
    }
    this._recomputeReplyCounts();
  }

  private _trackUnread(newMessages: QhorusMessage[]) {
    const increments = new Map<string, number>();
    for (const msg of newMessages) {
      if (msg.channelId === this.selectedChannelId) continue;
      if (msg.messageType === 'EVENT') continue;
      if (msg.sender === this._currentUserId) continue;
      increments.set(msg.channelId, (increments.get(msg.channelId) ?? 0) + 1);
    }
    if (increments.size > 0) {
      this.channels = this.channels.map(ch => {
        const inc = increments.get(ch.id);
        return inc ? { ...ch, unreadCount: (ch.unreadCount ?? 0) + inc } : ch;
      });
    }
  }

  private _recomputeReplyCounts() {
    const counts = new Map<string, number>();
    for (const m of this.messages) {
      if (m.inReplyTo) {
        counts.set(m.inReplyTo, (counts.get(m.inReplyTo) ?? 0) + 1);
      }
    }
    this.messages = this.messages.map(m => ({
      ...m,
      replyCount: counts.get(m.id) ?? 0,
    }));
  }

  private _toMessage(row: unknown[]): QhorusMessage {
    let artefactRefs: readonly ArtefactRef[] = [];
    try {
      const refsStr = row[10] as string;
      if (refsStr && refsStr !== '[]') artefactRefs = JSON.parse(refsStr);
    } catch { /* ignore parse errors */ }
    const msg: QhorusMessage = {
      id: row[1] as string, channelId: row[0] as string, sender: row[3] as string,
      messageType: (row[6] as string as MessageType) || 'EVENT',
      actorType: (row[7] as string as ActorType) || 'HUMAN',
      content: row[4] as string, topicId: (row[8] as string) || '',
      topic: this._resolveTopicName(row[8] as string),
      replyCount: 0, artefactRefs, createdAt: row[5] as string,
    };
    const corr = row[9] as string;
    const parent = row[2] as string;
    const target = row[11] as string;
    if (corr) (msg as { correlationId: string }).correlationId = corr;
    if (parent) (msg as { inReplyTo: string }).inReplyTo = parent;
    if (target) (msg as { target: string }).target = target;
    return msg;
  }

  setCurrentUser(userId: string) {
    this._currentUserId = userId;
  }

  latestMessageId(channelId: string): string | undefined {
    const channelMsgs = this.messages.filter(m => m.channelId === channelId);
    return channelMsgs.length > 0 ? channelMsgs[channelMsgs.length - 1]!.id : undefined;
  }

  hostConnected() {}
  hostDisconnected() {}
}
