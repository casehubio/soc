import { describe, it, expect, vi } from 'vitest';
import { ReactionController } from './reaction-controller.js';
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

function messageRow(channelId: string, messageId: string): unknown[] {
  return [channelId, messageId, '', 'alice', 'text', '2026-01-01T00:00:00Z', 'EVENT', 'HUMAN', '', '', '[]', ''];
}

function setup() {
  const host = new MockHost();
  const push = new PushController(host as any);
  const channels = new ChannelStateController(host as any, push);
  const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const ctrl = new ReactionController(host as any, push, channels, {
    restBase: '/api', fetch: mockFetch,
  });
  return { host, push, channels, ctrl, mockFetch };
}

describe('ReactionController', () => {
  describe('reaction ops', () => {
    it('applies reaction snapshot', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'reactions',
        rows: [['msg-1', '👍'], ['msg-1', '❤️']],
      });
      expect(ctrl.reactions).toHaveLength(2);
      expect(ctrl.reactions[0]!.messageId).toBe('msg-1');
      expect(ctrl.reactions[0]!.emoji).toBe('👍');
    });

    it('appends reactions', () => {
      const { push, ctrl } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'reactions', rows: [['msg-1', '👍']] });
      push.applyOp({ op: 'append', dataset: 'reactions', rows: [['msg-1', '❤️']] });
      expect(ctrl.reactions).toHaveLength(2);
    });

    it('removes reaction by composite key (messageId:emoji)', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'reactions',
        rows: [['msg-1', '👍'], ['msg-1', '❤️']],
      });
      push.applyOp({ op: 'remove', dataset: 'reactions', key: 'msg-1:👍' });
      expect(ctrl.reactions).toHaveLength(1);
      expect(ctrl.reactions[0]!.emoji).toBe('❤️');
    });

    it('removes all reactions for a message by simple key', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'reactions',
        rows: [['msg-1', '👍'], ['msg-1', '❤️'], ['msg-2', '👎']],
      });
      push.applyOp({ op: 'remove', dataset: 'reactions', key: 'msg-1' });
      expect(ctrl.reactions).toHaveLength(1);
      expect(ctrl.reactions[0]!.messageId).toBe('msg-2');
    });
  });

  describe('filteredReactions', () => {
    it('returns reactions for selected channel messages only', () => {
      const { push, channels, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'messages',
        rows: [messageRow('ch-1', 'msg-1'), messageRow('ch-2', 'msg-2')],
      });
      push.applyOp({
        op: 'snapshot', dataset: 'reactions',
        rows: [['msg-1', '👍'], ['msg-2', '❤️']],
      });
      channels.handleEvent(ChannelEventTopics.SELECT_CHANNEL, { channelId: 'ch-1' });
      const filtered = ctrl.filteredReactions();
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.messageId).toBe('msg-1');
    });

    it('returns empty when no channel selected', () => {
      const { push, ctrl } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'reactions', rows: [['msg-1', '👍']] });
      expect(ctrl.filteredReactions()).toEqual([]);
    });
  });

  describe('REST calls', () => {
    it('adds reaction via POST', () => {
      const { push, channels, ctrl, mockFetch } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'messages', rows: [messageRow('ch-1', 'msg-1')] });
      channels.handleEvent(ChannelEventTopics.SELECT_CHANNEL, { channelId: 'ch-1' });
      ctrl.handleEvent(ChannelEventTopics.REACT, { messageId: 'msg-1', emoji: '👍' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/messages/msg-1/reactions',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.emoji).toBe('👍');
    });

    it('removes reaction via DELETE', () => {
      const { push, channels, ctrl, mockFetch } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'messages', rows: [messageRow('ch-1', 'msg-1')] });
      channels.handleEvent(ChannelEventTopics.SELECT_CHANNEL, { channelId: 'ch-1' });
      ctrl.handleEvent(ChannelEventTopics.UNREACT, { messageId: 'msg-1', emoji: '👍' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/channels/ch-1/messages/msg-1/reactions/%F0%9F%91%8D',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('skips reaction when message not found', () => {
      const { ctrl, mockFetch } = setup();
      ctrl.handleEvent(ChannelEventTopics.REACT, { messageId: 'missing', emoji: '👍' });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
