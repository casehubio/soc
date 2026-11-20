import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ChannelStateController } from './channel-state-controller.js';
import { ChannelEventTopics } from './events.js';
import type {
  SendMessagePayload, CreateChannelPayload, DeleteChannelPayload,
  MessageSelectedPayload, TopicActionPayload, RenameTopicPayload,
  MergeTopicPayload, CreateTopicPayload,
} from './events.js';

export interface MessagingConfig {
  readonly restBase: string | (() => string);
  readonly messageRestBase?: string | (() => string);
  readonly fetch?: typeof globalThis.fetch;
}

export class MessagingController implements ReactiveController {
  replyTo: { messageId: string; senderName: string } | undefined;

  private _host: ReactiveControllerHost;
  private _channels: ChannelStateController;
  private _restBase: string | (() => string);
  private _messageRestBase: string | (() => string) | undefined;
  private _fetch: typeof globalThis.fetch;

  private get _base(): string {
    return typeof this._restBase === 'function' ? this._restBase() : this._restBase;
  }

  private get _msgBase(): string {
    if (this._messageRestBase) {
      return typeof this._messageRestBase === 'function' ? this._messageRestBase() : this._messageRestBase;
    }
    return `${this._base}/channels`;
  }

  constructor(host: ReactiveControllerHost, channels: ChannelStateController, config: MessagingConfig) {
    this._host = host;
    this._channels = channels;
    this._restBase = config.restBase;
    this._messageRestBase = config.messageRestBase;
    this._fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
    host.addController(this);
  }

  handleEvent(topic: string, payload: unknown) {
    switch (topic) {
      case ChannelEventTopics.SEND_MESSAGE:
        this._sendMessage(payload as SendMessagePayload);
        break;
      case ChannelEventTopics.CREATE_CHANNEL:
        this._createChannel(payload as CreateChannelPayload);
        break;
      case ChannelEventTopics.DELETE_CHANNEL:
        this._deleteChannel((payload as DeleteChannelPayload).channelId);
        break;
      case ChannelEventTopics.MESSAGE_SELECTED: {
        const msg = (payload as MessageSelectedPayload).message;
        this.replyTo = { messageId: msg.inReplyTo ?? msg.id, senderName: msg.sender };
        this._host.requestUpdate();
        break;
      }
      case ChannelEventTopics.CREATE_TOPIC: {
        const cp = payload as CreateTopicPayload;
        this._postJson(`${this._base}/channels/${cp.channelId}/topics`, { name: cp.name });
        break;
      }
      case ChannelEventTopics.RENAME_TOPIC: {
        const rp = payload as RenameTopicPayload;
        this._putJson(`${this._base}/channels/${rp.channelId}/topics/${rp.topicId}`, { name: rp.newName });
        break;
      }
      case ChannelEventTopics.MERGE_TOPIC: {
        const mp = payload as MergeTopicPayload;
        this._postJson(`${this._base}/channels/${mp.channelId}/topics/${mp.sourceTopicId}/merge`, { targetTopicId: mp.targetTopicId });
        break;
      }
      case ChannelEventTopics.RESOLVE_TOPIC:
        this._updateTopicState(payload as TopicActionPayload, 'RESOLVED');
        break;
      case ChannelEventTopics.REOPEN_TOPIC:
        this._updateTopicState(payload as TopicActionPayload, 'ACTIVE');
        break;
      case ChannelEventTopics.ARCHIVE_TOPIC:
        this._updateTopicState(payload as TopicActionPayload, 'ARCHIVED');
        break;
    }
  }

  private async _sendMessage(payload: SendMessagePayload) {
    try {
      const url = payload.inReplyTo
        ? `${this._msgBase}/${payload.channelId}/messages/${payload.inReplyTo}/replies`
        : `${this._msgBase}/${payload.channelId}/messages`;
      const body: Record<string, unknown> = { text: payload.content };
      if (payload.speechAct) body.messageType = payload.speechAct;
      if (payload.artefactRefs?.length) body.artefactRefs = payload.artefactRefs;
      if (payload.topicId) body.topicId = payload.topicId;
      else if (payload.topic) body.topic = payload.topic;
      await this._postJson(url, body);
      this.replyTo = undefined;
      this._host.requestUpdate();
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }

  private async _createChannel(payload: CreateChannelPayload) {
    try {
      await this._postJson(`${this._restBase}/channels`, { name: payload.name });
    } catch (e) {
      console.error('Failed to create channel:', e);
    }
  }

  private async _deleteChannel(channelId: string) {
    try {
      await this._fetch(`${this._base}/channels/${channelId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete channel:', e);
    }
  }

  private _updateTopicState(payload: TopicActionPayload, state: string) {
    this._putJson(`${this._base}/channels/${payload.channelId}/topics/${payload.topicId}`, { state });
  }

  private _postJson(url: string, body: unknown) {
    return this._fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private _putJson(url: string, body: unknown) {
    return this._fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  hostConnected() {}
  hostDisconnected() {}
}
