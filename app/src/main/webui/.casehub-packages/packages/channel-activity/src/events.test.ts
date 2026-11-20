import { describe, it, expect, vi } from 'vitest';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';

describe('ChannelEventTopics', () => {
  it('all topic constants have channel: or space: prefix', () => {
    for (const topic of Object.values(ChannelEventTopics)) {
      expect(topic).toMatch(/^(channel|space):/);
    }
  });

  it('all topic constants have exact string values', () => {
    expect(ChannelEventTopics.SEND_MESSAGE).toBe('channel:send-message');
    expect(ChannelEventTopics.REACT).toBe('channel:react');
    expect(ChannelEventTopics.UNREACT).toBe('channel:unreact');
    expect(ChannelEventTopics.CREATE_CHANNEL).toBe('channel:create');
    expect(ChannelEventTopics.DELETE_CHANNEL).toBe('channel:delete');
    expect(ChannelEventTopics.SELECT_CHANNEL).toBe('channel:selected');
    expect(ChannelEventTopics.MESSAGE_SELECTED).toBe('channel:message-selected');
    expect(ChannelEventTopics.CURSOR_CATCHUP).toBe('channel:cursor-catchup');
    expect(ChannelEventTopics.CURSOR_RELOAD).toBe('channel:cursor-reload');
  });

  it('has exactly 22 topics', () => {
    expect(Object.keys(ChannelEventTopics).length).toBe(24);
  });

  it('topic event constants have channel: prefix', () => {
    expect(ChannelEventTopics.SELECT_TOPIC).toBe('channel:select-topic');
    expect(ChannelEventTopics.VIEW_MODE).toBe('channel:view-mode');
    expect(ChannelEventTopics.CREATE_TOPIC).toBe('channel:create-topic');
    expect(ChannelEventTopics.RESOLVE_TOPIC).toBe('channel:resolve-topic');
    expect(ChannelEventTopics.REOPEN_TOPIC).toBe('channel:reopen-topic');
    expect(ChannelEventTopics.ARCHIVE_TOPIC).toBe('channel:archive-topic');
    expect(ChannelEventTopics.RENAME_TOPIC).toBe('channel:rename-topic');
    expect(ChannelEventTopics.MERGE_TOPIC).toBe('channel:merge-topic');
  });
});

describe('emitPagesEvent integration', () => {
  it('dispatches pages-event with topic and payload', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    target.addEventListener('pages-event', handler);

    emitPagesEvent(target, ChannelEventTopics.SELECT_CHANNEL, { channelId: 'ch-1' });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.detail.topic).toBe('channel:selected');
    expect(event.detail.payload).toEqual({ channelId: 'ch-1' });
  });

  it('bubbles and composes', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    document.body.appendChild(target);
    document.body.addEventListener('pages-event', handler);

    emitPagesEvent(target, ChannelEventTopics.SEND_MESSAGE, { channelId: 'ch-1', content: 'hello' });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);

    document.body.removeChild(target);
    document.body.removeEventListener('pages-event', handler);
  });

  it('emits cursor-catchup with channelId and cursorId', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    target.addEventListener('pages-event', handler);

    emitPagesEvent(target, ChannelEventTopics.CURSOR_CATCHUP, { channelId: 'ch-1', cursorId: 'cur-42' });

    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.detail.topic).toBe('channel:cursor-catchup');
    expect(event.detail.payload).toEqual({ channelId: 'ch-1', cursorId: 'cur-42' });
  });

  it('emits cursor-reload with channelId only', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    target.addEventListener('pages-event', handler);

    emitPagesEvent(target, ChannelEventTopics.CURSOR_RELOAD, { channelId: 'ch-1' });

    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.detail.topic).toBe('channel:cursor-reload');
    expect(event.detail.payload).toEqual({ channelId: 'ch-1' });
  });
});
