import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagingController } from './messaging-controller.js';
import { ChannelStateController } from './channel-state-controller.js';
import { PushController } from './push-controller.js';
import { ChannelEventTopics } from './events.js';

class MockHost {
  controllers: any[] = [];
  updateCount = 0;
  addController(c: any) { this.controllers.push(c); }
  removeController() {}
  requestUpdate() { this.updateCount++; }
  get updateComplete() { return Promise.resolve(true); }
}

function setup() {
  const host = new MockHost();
  const push = new PushController(host as any);
  const channels = new ChannelStateController(host as any, push);
  const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const ctrl = new MessagingController(host as any, channels, {
    restBase: '/api', fetch: mockFetch,
  });
  return { host, push, channels, ctrl, mockFetch };
}

describe('MessagingController', () => {
  describe('reply state', () => {
    it('starts with no reply', () => {
      const { ctrl } = setup();
      expect(ctrl.replyTo).toBeUndefined();
    });

    it('sets replyTo on MESSAGE_SELECTED', () => {
      const { ctrl } = setup();
      ctrl.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, {
        message: { id: 'msg-1', sender: 'alice', inReplyTo: undefined },
      });
      expect(ctrl.replyTo).toEqual({ messageId: 'msg-1', senderName: 'alice' });
    });

    it('uses inReplyTo as messageId when available', () => {
      const { ctrl } = setup();
      ctrl.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, {
        message: { id: 'msg-2', sender: 'bob', inReplyTo: 'msg-1' },
      });
      expect(ctrl.replyTo!.messageId).toBe('msg-1');
    });

    it('clears replyTo after sending message', async () => {
      const { ctrl } = setup();
      ctrl.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, {
        message: { id: 'msg-1', sender: 'alice' },
      });
      expect(ctrl.replyTo).toBeDefined();
      ctrl.handleEvent(ChannelEventTopics.SEND_MESSAGE, {
        channelId: 'ch-1', content: 'hello',
      });
      await vi.waitFor(() => expect(ctrl.replyTo).toBeUndefined());
    });
  });

  describe('REST calls', () => {
    it('sends message via POST', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.SEND_MESSAGE, {
        channelId: 'ch-1', content: 'hello world',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/messages',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.text).toBe('hello world');
    });

    it('sends reply via POST to replies endpoint', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.SEND_MESSAGE, {
        channelId: 'ch-1', content: 'reply text', inReplyTo: 'msg-1',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/messages/msg-1/replies',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('includes speechAct in message body', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.SEND_MESSAGE, {
        channelId: 'ch-1', content: 'cmd', speechAct: 'COMMAND',
      });
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.messageType).toBe('COMMAND');
    });

    it('includes artefactRefs in message body', () => {
      const refs = [{ uri: '/doc', type: 'DOCUMENT', label: 'spec' }];
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.SEND_MESSAGE, {
        channelId: 'ch-1', content: 'see', artefactRefs: refs,
      });
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.artefactRefs).toEqual(refs);
    });

    it('creates channel via POST', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.CREATE_CHANNEL, { name: 'new-channel' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.name).toBe('new-channel');
    });

    it('deletes channel via DELETE', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.DELETE_CHANNEL, { channelId: 'ch-1' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('creates topic via POST', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.CREATE_TOPIC, {
        channelId: 'ch-1', name: 'design',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/topics',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('renames topic via PUT', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.RENAME_TOPIC, {
        channelId: 'ch-1', topicId: 't-1', newName: 'architecture',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/topics/t-1',
        expect.objectContaining({ method: 'PUT' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.name).toBe('architecture');
    });

    it('merges topic via POST', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.MERGE_TOPIC, {
        channelId: 'ch-1', sourceTopicId: 't-1', targetTopicId: 't-2',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/topics/t-1/merge',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('resolves topic via PUT with RESOLVED state', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.RESOLVE_TOPIC, {
        channelId: 'ch-1', topicId: 't-1',
      });
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.state).toBe('RESOLVED');
    });

    it('reopens topic via PUT with ACTIVE state', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.REOPEN_TOPIC, {
        channelId: 'ch-1', topicId: 't-1',
      });
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.state).toBe('ACTIVE');
    });

    it('archives topic via PUT with ARCHIVED state', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.ARCHIVE_TOPIC, {
        channelId: 'ch-1', topicId: 't-1',
      });
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.state).toBe('ARCHIVED');
    });
  });
});
