import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController, DatasetOp } from './push-controller.js';
import type { ChannelStateController } from './channel-state-controller.js';
import type { Reaction } from './types.js';
import { ChannelEventTopics } from './events.js';
import type { ReactPayload } from './events.js';

export interface ReactionConfig {
  readonly restBase: string | (() => string);
  readonly fetch?: typeof globalThis.fetch;
}

export class ReactionController implements ReactiveController {
  reactions: Reaction[] = [];

  private _host: ReactiveControllerHost;
  private _channels: ChannelStateController;
  private _restBase: string | (() => string);
  private _fetch: typeof globalThis.fetch;

  private get _base(): string {
    return typeof this._restBase === 'function' ? this._restBase() : this._restBase;
  }

  constructor(host: ReactiveControllerHost, push: PushController, channels: ChannelStateController, config: ReactionConfig) {
    this._host = host;
    this._channels = channels;
    this._restBase = config.restBase;
    this._fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
    host.addController(this);
    push.registerDatasetHandler('reactions', (op) => { this._applyReactions(op); this._host.requestUpdate(); });
  }

  filteredReactions(): Reaction[] {
    if (!this._channels.selectedChannelId) return [];
    const channelMessageIds = new Set(
      this._channels.messages
        .filter(m => m.channelId === this._channels.selectedChannelId)
        .map(m => m.id)
    );
    return this.reactions.filter(r => channelMessageIds.has(r.messageId));
  }

  handleEvent(topic: string, payload: unknown) {
    switch (topic) {
      case ChannelEventTopics.REACT:
        this._addReaction(payload as ReactPayload);
        break;
      case ChannelEventTopics.UNREACT:
        this._removeReaction(payload as ReactPayload);
        break;
    }
  }

  private async _addReaction(payload: ReactPayload) {
    const msg = this._channels.messages.find(m => m.id === payload.messageId);
    if (!msg) return;
    try {
      await this._fetch(
        `${this._base}/channels/${msg.channelId}/messages/${payload.messageId}/reactions`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji: payload.emoji }) },
      );
    } catch (e) {
      console.error('Failed to add reaction:', e);
    }
  }

  private async _removeReaction(payload: ReactPayload) {
    const msg = this._channels.messages.find(m => m.id === payload.messageId);
    if (!msg) return;
    try {
      await this._fetch(
        `${this._base}/channels/${msg.channelId}/messages/${payload.messageId}/reactions/${encodeURIComponent(payload.emoji)}`,
        { method: 'DELETE' },
      );
    } catch (e) {
      console.error('Failed to remove reaction:', e);
    }
  }

  private _applyReactions(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.reactions = (op.rows ?? []).map(r => this._toReaction(r));
    } else if (op.op === 'append' && op.rows) {
      this.reactions = [...this.reactions, ...op.rows.map(r => this._toReaction(r))];
    } else if (op.op === 'remove' && op.key) {
      const sep = op.key.indexOf(':');
      if (sep >= 0) {
        const msgId = op.key.substring(0, sep);
        const emoji = op.key.substring(sep + 1);
        this.reactions = this.reactions.filter(r => !(r.messageId === msgId && r.emoji === emoji));
      } else {
        this.reactions = this.reactions.filter(r => r.messageId !== op.key);
      }
    }
  }

  private _toReaction(r: unknown[]): Reaction {
    return { messageId: r[0] as string, emoji: r[1] as string, actorId: '', createdAt: '' };
  }

  hostConnected() {}
  hostDisconnected() {}
}
