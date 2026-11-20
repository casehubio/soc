import { describe, it, expect, afterEach, vi } from 'vitest';
import { html } from 'lit';
import './channel-feed.js';
import './channel-message.js';
import './channel-thread.js';
import './channel-reaction-bar.js';
import type { QhorusMessage } from './types.js';
import { ChannelEventTopics } from './events.js';

import type { QhorusTopic } from './types.js';

function msg(id: string, overrides: Partial<QhorusMessage> = {}): QhorusMessage {
  return {
    id, channelId: 'ch-1', sender: 'agent-a', messageType: 'EVENT',
    actorType: 'AGENT', content: `Message ${id}`, topic: 'General', topicId: 't-default',
    replyCount: 0, artefactRefs: [], createdAt: '2026-07-07T12:00:00Z', ...overrides,
  };
}

function topic(id: string, name: string, overrides: Partial<QhorusTopic> = {}): QhorusTopic {
  return {
    id, channelId: 'ch-1', name, state: 'ACTIVE', messageCount: 0,
    createdAt: '2026-01-01T00:00:00Z', ...overrides,
  };
}

afterEach(() => { document.body.innerHTML = ''; });

describe('agency-channel-feed', () => {
  it('renders messages chronologically', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1'), msg('2'), msg('3')];
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect(msgs.length).toBe(3);
  });

  it('groups consecutive messages from same sender within 2 min', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('1', { sender: 'alice', createdAt: '2026-07-07T12:00:00Z' }),
      msg('2', { sender: 'alice', createdAt: '2026-07-07T12:00:30Z' }),
      msg('3', { sender: 'bob', createdAt: '2026-07-07T12:01:00Z' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const headers = el.shadowRoot!.querySelectorAll('.message-group-header');
    expect(headers.length).toBe(2);
  });

  it('splits sender groups when messages >2min apart', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('1', { sender: 'alice', createdAt: '2026-07-07T12:00:00Z' }),
      msg('2', { sender: 'alice', createdAt: '2026-07-07T12:02:01Z' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const headers = el.shadowRoot!.querySelectorAll('.message-group-header');
    expect(headers.length).toBe(2);
  });

  it('renders empty state when messages array is empty', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [];
    document.body.appendChild(el);
    await el.updateComplete;

    const emptyDiv = el.shadowRoot!.querySelector('.empty');
    expect(emptyDiv).toBeTruthy();
    expect(emptyDiv!.textContent!.trim()).toBe('No messages yet');
  });

  it('separates replies from roots and renders thread inline', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('root', { sender: 'alice' }),
      msg('reply1', { sender: 'bob', inReplyTo: 'root' }),
      msg('reply2', { sender: 'carol', inReplyTo: 'root' }),
      msg('standalone', { sender: 'dave' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const threads = el.shadowRoot!.querySelectorAll('agency-channel-thread');
    expect(threads.length).toBe(1);
    const thread = threads[0] as any;
    expect(thread.rootMessage.id).toBe('root');
    expect(thread.replies.length).toBe(2);
  });

  it('promotes orphaned replies to roots when parent is missing', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('m1', { sender: 'alice' }),
      msg('orphan', { sender: 'bob', inReplyTo: 'deleted-parent' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect(messages.length).toBe(2);
    const threads = el.shadowRoot!.querySelectorAll('agency-channel-thread');
    expect(threads.length).toBe(0);
  });

  it('filters reactions per message correctly', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' }), msg('m2', { sender: 'bob' })];
    el.reactions = [
      { messageId: 'm1', emoji: '👍', actorId: 'u1', createdAt: '2026-07-07T12:00:00Z' },
      { messageId: 'm1', emoji: '❤️', actorId: 'u2', createdAt: '2026-07-07T12:00:00Z' },
      { messageId: 'm2', emoji: '🔥', actorId: 'u3', createdAt: '2026-07-07T12:00:00Z' },
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((messages[0] as any).reactions.length).toBe(2);
    expect((messages[1] as any).reactions.length).toBe(1);
  });

  it('feed container has role="log" and aria-live="polite"', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    const feed = el.shadowRoot!.querySelector('.feed');
    expect(feed!.getAttribute('role')).toBe('log');
    expect(feed!.getAttribute('aria-live')).toBe('polite');
  });

  // --- renderContextHeader (extension point) ---

  it('renders context header when callback is provided', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    el.renderContextHeader = () => html`<div class="test-header">Case Context</div>`;
    document.body.appendChild(el);
    await el.updateComplete;

    const header = el.shadowRoot!.querySelector('.test-header');
    expect(header).toBeTruthy();
    expect(header!.textContent).toBe('Case Context');
  });

  it('does not render context header when callback is absent', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    const header = el.shadowRoot!.querySelector('.context-header');
    expect(header).toBeNull();
  });

  // --- terminalDimming (Gap #2) ---

  it('applies terminal-dimmed class to DONE/FAILURE/DECLINE/HANDOFF messages', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('1', { messageType: 'DONE' }),
      msg('2', { messageType: 'QUERY' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.message-item');
    expect(items[0].classList.contains('terminal-dimmed')).toBe(true);
    expect(items[1].classList.contains('terminal-dimmed')).toBe(false);
  });

  it('does not apply terminal-dimmed when terminalDimming=false', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1', { messageType: 'DONE' })];
    el.terminalDimming = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const item = el.shadowRoot!.querySelector('.message-item');
    expect(item!.classList.contains('terminal-dimmed')).toBe(false);
  });

  // --- eventStyling (Gap #2) ---

  it('applies event-dimmed class to EVENT messages', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('1', { messageType: 'EVENT' }),
      msg('2', { messageType: 'COMMAND' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.message-item');
    expect(items[0].classList.contains('event-dimmed')).toBe(true);
    expect(items[1].classList.contains('event-dimmed')).toBe(false);
  });

  it('does not apply event-dimmed when eventStyling=false', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1', { messageType: 'EVENT' })];
    el.eventStyling = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const item = el.shadowRoot!.querySelector('.message-item');
    expect(item!.classList.contains('event-dimmed')).toBe(false);
  });

  // --- staleCursorMinutes (Gap #5) ---

  it('shows stale prompt when channel cursor is older than threshold', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.channelId = 'ch-1';
    el.staleCursorMinutes = 1;
    el.messages = [];

    const staleTimestamp = Date.now() - 2 * 60 * 1000;
    sessionStorage.setItem('channel-activity.cursors', JSON.stringify({ 'ch-1': { id: 'cur-42', ts: staleTimestamp } }));

    document.body.appendChild(el);
    await el.updateComplete;

    const prompt = el.shadowRoot!.querySelector('.stale-prompt');
    expect(prompt).toBeTruthy();

    sessionStorage.removeItem('channel-activity.cursors');
  });

  it('emits channel:cursor-catchup when catch-up button clicked', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.channelId = 'ch-1';
    el.staleCursorMinutes = 1;
    el.messages = [];

    const staleTimestamp = Date.now() - 2 * 60 * 1000;
    sessionStorage.setItem('channel-activity.cursors', JSON.stringify({ 'ch-1': { id: 'cur-42', ts: staleTimestamp } }));

    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);

    const catchupBtn = el.shadowRoot!.querySelector('.stale-catchup') as HTMLButtonElement;
    catchupBtn.click();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.CURSOR_CATCHUP);
    expect(handler.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch-1', cursorId: 'cur-42' });

    sessionStorage.removeItem('channel-activity.cursors');
  });

  it('emits channel:cursor-reload when reload button clicked', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.channelId = 'ch-1';
    el.staleCursorMinutes = 1;
    el.messages = [];

    const staleTimestamp = Date.now() - 2 * 60 * 1000;
    sessionStorage.setItem('channel-activity.cursors', JSON.stringify({ 'ch-1': { id: 'cur-42', ts: staleTimestamp } }));

    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);

    const reloadBtn = el.shadowRoot!.querySelector('.stale-reload') as HTMLButtonElement;
    reloadBtn.click();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.CURSOR_RELOAD);
    expect(handler.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch-1' });

    sessionStorage.removeItem('channel-activity.cursors');
  });

  it('clears stale prompt when messages update', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.channelId = 'ch-1';
    el.staleCursorMinutes = 1;
    el.messages = [];

    const staleTimestamp = Date.now() - 2 * 60 * 1000;
    sessionStorage.setItem('channel-activity.cursors', JSON.stringify({ 'ch-1': { id: 'cur-42', ts: staleTimestamp } }));

    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.stale-prompt')).toBeTruthy();

    el.messages = [msg('1')];
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.stale-prompt')).toBeNull();

    sessionStorage.removeItem('channel-activity.cursors');
  });

  it('does not show stale prompt when staleCursorMinutes=0', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.channelId = 'ch-1';
    el.staleCursorMinutes = 0;
    el.messages = [];

    const staleTimestamp = Date.now() - 60 * 60 * 1000;
    sessionStorage.setItem('channel-activity.cursors', JSON.stringify({ 'ch-1': { id: 'cur-42', ts: staleTimestamp } }));

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.stale-prompt')).toBeNull();

    sessionStorage.removeItem('channel-activity.cursors');
  });

  it('does not show stale prompt when cursor is fresh', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.channelId = 'ch-1';
    el.staleCursorMinutes = 30;
    el.messages = [];

    sessionStorage.setItem('channel-activity.cursors', JSON.stringify({ 'ch-1': { id: 'cur-42', ts: Date.now() } }));

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.stale-prompt')).toBeNull();

    sessionStorage.removeItem('channel-activity.cursors');
  });

  it('passes channelName to channel-message elements', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.channelName = 'general';
    document.body.appendChild(el);
    await el.updateComplete;

    const msgEl = el.shadowRoot!.querySelector('agency-channel-message') as any;
    expect(msgEl.channelName).toBe('general');
  });

  // --- renderContent passthrough ---

  it('passes renderContent to channel-message elements', async () => {
    const renderContent = vi.fn((m: QhorusMessage) => html`<span class="custom">${m.content}</span>`);
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.renderContent = renderContent;
    document.body.appendChild(el);
    await el.updateComplete;

    const msgEl = el.shadowRoot!.querySelector('agency-channel-message') as any;
    expect(msgEl.renderContent).toBe(renderContent);
  });

  it('passes renderContent to channel-thread elements', async () => {
    const renderContent = vi.fn(() => undefined);
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('root', { sender: 'alice' }),
      msg('reply1', { sender: 'bob', inReplyTo: 'root' }),
    ];
    el.renderContent = renderContent;
    document.body.appendChild(el);
    await el.updateComplete;

    const thread = el.shadowRoot!.querySelector('agency-channel-thread') as any;
    expect(thread.renderContent).toBe(renderContent);
  });

  // --- formatSender passthrough ---

  it('passes formatSender to channel-message elements', async () => {
    const formatSender = vi.fn((s: string) => s.toUpperCase());
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.formatSender = formatSender;
    document.body.appendChild(el);
    await el.updateComplete;

    const msgEl = el.shadowRoot!.querySelector('agency-channel-message') as any;
    expect(msgEl.formatSender).toBe(formatSender);
  });

  // --- View modes ---

  it('defaults viewMode to flat', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    expect(el.viewMode).toBe('flat');
  });

  it('topics mode: renders topic section headers', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.viewMode = 'topics';
    el.topics = [
      topic('t1', 'General'),
      topic('t2', 'deployment'),
    ];
    el.messages = [
      msg('m1', { topicId: 't1', topic: 'General', createdAt: '2026-01-01T00:00:00Z' }),
      msg('m2', { topicId: 't2', topic: 'deployment', sender: 'bob', createdAt: '2026-01-01T00:01:00Z' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const headers = el.shadowRoot!.querySelectorAll('.topic-section-header');
    expect(headers.length).toBe(2);
  });

  // --- selectedMessageId ---

  it('highlights the selected message with a selected class', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' }), msg('m2', { sender: 'bob' })];
    el.selectedMessageId = 'm2';
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.message-item');
    expect(items[0].classList.contains('selected')).toBe(false);
    expect(items[1].classList.contains('selected')).toBe(true);
  });

  it('highlights a thread root with selected class when selectedMessageId matches', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('root', { sender: 'alice' }),
      msg('reply1', { sender: 'bob', inReplyTo: 'root' }),
    ];
    el.selectedMessageId = 'root';
    document.body.appendChild(el);
    await el.updateComplete;

    const thread = el.shadowRoot!.querySelector('agency-channel-thread') as HTMLElement;
    expect(thread.classList.contains('selected')).toBe(true);
  });

  it('does not highlight thread when a different message is selected', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('root', { sender: 'alice' }),
      msg('reply1', { sender: 'bob', inReplyTo: 'root' }),
      msg('other', { sender: 'carol' }),
    ];
    el.selectedMessageId = 'other';
    document.body.appendChild(el);
    await el.updateComplete;

    const thread = el.shadowRoot!.querySelector('agency-channel-thread') as HTMLElement;
    expect(thread.classList.contains('selected')).toBe(false);
  });

  it('expands and highlights thread when selectedMessageId is a reply inside it', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('root', { sender: 'mark', messageType: 'COMMAND' }),
      msg('reply1', { sender: 'agent-atlas', messageType: 'STATUS', inReplyTo: 'root' }),
      msg('reply2', { sender: 'agent-atlas', messageType: 'DONE', inReplyTo: 'root' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const thread = el.shadowRoot!.querySelector('agency-channel-thread') as any;
    expect(thread.collapsed).toBe(true);
    expect(thread.classList.contains('selected')).toBe(false);

    el.selectedMessageId = 'reply2';
    await el.updateComplete;
    await thread.updateComplete;

    expect(thread.collapsed).toBe(false);
    expect(thread.classList.contains('selected')).toBe(true);
    expect(thread.shadowRoot!.querySelectorAll('.reply agency-channel-message').length).toBe(2);
  });

  it('adds data-message-id to message-item wrappers', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' }), msg('m2', { sender: 'bob' })];
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.message-item');
    expect(items[0].getAttribute('data-message-id')).toBe('m1');
    expect(items[1].getAttribute('data-message-id')).toBe('m2');
  });

  it('passes selectedMessageId to channel-thread components', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('root', { sender: 'alice' }),
      msg('reply1', { sender: 'bob', inReplyTo: 'root' }),
    ];
    el.selectedMessageId = 'reply1';
    document.body.appendChild(el);
    await el.updateComplete;

    const thread = el.shadowRoot!.querySelector('agency-channel-thread') as any;
    expect(thread.selectedMessageId).toBe('reply1');
  });

  it('topics mode: does not render empty topic sections', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.viewMode = 'topics';
    el.topics = [
      topic('t1', 'General'),
      topic('t2', 'empty-topic'),
    ];
    el.messages = [
      msg('m1', { topicId: 't1', topic: 'General' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const headers = el.shadowRoot!.querySelectorAll('.topic-section-header');
    expect(headers.length).toBe(1);
  });

  // --- Accessibility mixins (#12) ---

  it('exposes announce() from LiveRegionMixin', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [];
    document.body.appendChild(el);
    await el.updateComplete;

    expect(typeof el.announce).toBe('function');
  });

  it('announces new message count when messages arrive', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    const spy = vi.spyOn(el, 'announce');
    el.messages = [msg('1'), msg('2'), msg('3', { sender: 'bob' })];
    await el.updateComplete;

    expect(spy).toHaveBeenCalledWith('2 new messages');
  });

  it('announces singular form for one new message', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    const spy = vi.spyOn(el, 'announce');
    el.messages = [msg('1'), msg('2')];
    await el.updateComplete;

    expect(spy).toHaveBeenCalledWith('1 new message');
  });

  it('does not announce when message count stays the same', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    const spy = vi.spyOn(el, 'announce');
    el.messages = [msg('1')];
    await el.updateComplete;

    expect(spy).not.toHaveBeenCalled();
  });

  it('navigates message items with arrow keys via RovingTabindexMixin', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('m1', { sender: 'alice', createdAt: '2026-07-07T12:00:00Z' }),
      msg('m2', { sender: 'bob', createdAt: '2026-07-07T12:01:00Z' }),
      msg('m3', { sender: 'carol', createdAt: '2026-07-07T12:02:00Z' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    expect(typeof el.navigateRoving).toBe('function');

    const items = el.shadowRoot!.querySelectorAll('.message-item');
    expect(items.length).toBe(3);
    items.forEach((item: Element) => expect(item.getAttribute('tabindex')).toBe('-1'));
  });

  it('exposes trapFocus and releaseFocus from FocusTrapMixin', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [];
    document.body.appendChild(el);
    await el.updateComplete;

    expect(typeof el.trapFocus).toBe('function');
    expect(typeof el.releaseFocus).toBe('function');
  });

  it('exposes registerShortcut from KeyboardShortcutMixin', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [];
    document.body.appendChild(el);
    await el.updateComplete;

    expect(typeof el.registerShortcut).toBe('function');
    expect(typeof el.getShortcuts).toBe('function');
  });

  // --- Scroll-to-new-messages pill (#16) ---

  it('does not show pill when at bottom of feed', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1'), msg('2')];
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.new-messages-pill')).toBeNull();
  });

  it('shows pill with unread count when scrolled up and new messages arrive', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1'), msg('2')];
    document.body.appendChild(el);
    await el.updateComplete;

    el._scrolledUp = true;
    el.messages = [msg('1'), msg('2'), msg('3')];
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector('.new-messages-pill');
    expect(pill).toBeTruthy();
    expect(pill!.textContent).toContain('1');
  });

  it('accumulates unread count across multiple updates while scrolled up', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    el._scrolledUp = true;
    el.messages = [msg('1'), msg('2')];
    await el.updateComplete;

    el.messages = [msg('1'), msg('2'), msg('3'), msg('4')];
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector('.new-messages-pill');
    expect(pill).toBeTruthy();
    expect(pill!.textContent).toContain('3');
  });

  it('scrolls to bottom and hides pill on pill click', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    el._scrolledUp = true;
    el.messages = [msg('1'), msg('2')];
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector('.new-messages-pill') as HTMLElement;
    expect(pill).toBeTruthy();
    pill.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.new-messages-pill')).toBeNull();
    expect(el._scrolledUp).toBe(false);
  });

  it('resets unread count when user scrolls to bottom', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('1')];
    document.body.appendChild(el);
    await el.updateComplete;

    el._scrolledUp = true;
    el._unreadCount = 5;
    el.messages = [msg('1'), msg('2')];
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.new-messages-pill')).toBeTruthy();

    el._scrolledUp = false;
    el._unreadCount = 0;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.new-messages-pill')).toBeNull();
  });

  // --- Range highlighting (#26) ---

  it('applies background highlight to messages with entries in messageHighlights', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('m1', { sender: 'alice', createdAt: '2026-07-07T12:00:00Z' }),
      msg('m2', { sender: 'bob', createdAt: '2026-07-07T12:01:00Z' }),
      msg('m3', { sender: 'carol', createdAt: '2026-07-07T12:02:00Z' }),
    ];
    el.messageHighlights = { m1: 'var(--pages-accent-3)', m2: 'var(--pages-accent-3)' };
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.message-item');
    expect(items[0].style.background).toBe('var(--pages-accent-3)');
    expect(items[1].style.background).toBe('var(--pages-accent-3)');
    expect(items[2].style.background).toBe('');
  });

  it('does not apply highlight when messageHighlights is empty', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.messageHighlights = {};
    document.body.appendChild(el);
    await el.updateComplete;

    const item = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    expect(item.style.background).toBe('');
  });

  it('applies highlight in topics mode', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.viewMode = 'topics';
    el.topics = [{ id: 't1', channelId: 'ch-1', name: 'General', state: 'ACTIVE', messageCount: 1, createdAt: '2026-01-01T00:00:00Z' }];
    el.messages = [msg('m1', { topicId: 't1', topic: 'General' })];
    el.messageHighlights = { m1: 'var(--pages-success-3)' };
    document.body.appendChild(el);
    await el.updateComplete;

    const item = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    expect(item.style.background).toBe('var(--pages-success-3)');
  });

  it('renders hover toolbar when message is hovered', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.currentActorId = 'alice';
    document.body.appendChild(el);
    await el.updateComplete;

    const msgItem = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    msgItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await el.updateComplete;

    const toolbar = el.shadowRoot!.querySelector('agency-channel-hover-toolbar');
    expect(toolbar).toBeTruthy();
  });

  it('hides hover toolbar when mouse leaves message', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.currentActorId = 'alice';
    document.body.appendChild(el);
    await el.updateComplete;

    const msgItem = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    msgItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('agency-channel-hover-toolbar')).toBeTruthy();

    msgItem.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('agency-channel-hover-toolbar')).toBeNull();
  });

  it('passes currentActorId to hover toolbar', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.currentActorId = 'alice';
    document.body.appendChild(el);
    await el.updateComplete;

    const msgItem = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    msgItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await el.updateComplete;

    const toolbar = el.shadowRoot!.querySelector('agency-channel-hover-toolbar') as any;
    expect(toolbar.currentActorId).toBe('alice');
    expect(toolbar.message.id).toBe('m1');
  });

  it('shows toolbar on Enter key when message is focused', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.currentActorId = 'alice';
    document.body.appendChild(el);
    await el.updateComplete;

    const msgItem = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    msgItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await el.updateComplete;

    const toolbar = el.shadowRoot!.querySelector('agency-channel-hover-toolbar');
    expect(toolbar).toBeTruthy();
  });

  // --- Correction collapsing (#34 Batch 4) ---

  it('hides correction records from the feed and shows corrected content on original', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('msg-1', { sender: 'alice', content: 'Meeting at 3pm', messageType: 'RESPONSE' }),
      msg('msg-2', { sender: 'alice', content: 'Meeting at 4pm', messageType: 'RESPONSE', correctsMessageId: 'msg-1' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect(msgs.length).toBe(1);
    expect((msgs[0] as any).message.content).toBe('Meeting at 4pm');
  });

  it('applies latest correction when multiple corrections exist', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('msg-1', { sender: 'alice', content: 'v1', messageType: 'RESPONSE' }),
      msg('msg-2', { sender: 'alice', content: 'v2', messageType: 'RESPONSE', correctsMessageId: 'msg-1' }),
      msg('msg-3', { sender: 'alice', content: 'v3', messageType: 'RESPONSE', correctsMessageId: 'msg-1' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect(msgs.length).toBe(1);
    expect((msgs[0] as any).message.content).toBe('v3');
  });

  it('marks corrected messages with _corrected flag', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('msg-1', { sender: 'alice', content: 'Old', messageType: 'RESPONSE' }),
      msg('msg-2', { sender: 'alice', content: 'New', messageType: 'RESPONSE', correctsMessageId: 'msg-1' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((msgs[0] as any).message._corrected).toBe(true);
  });

  it('passes correction chain as _corrections on corrected messages', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('msg-1', { sender: 'alice', content: 'v1', messageType: 'RESPONSE' }),
      msg('msg-2', { sender: 'alice', content: 'v2', messageType: 'RESPONSE', correctsMessageId: 'msg-1' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((msgs[0] as any).message._corrections.length).toBe(1);
    expect((msgs[0] as any).message._corrections[0].content).toBe('v2');
  });

  it('marks retracted messages with _retracted flag', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('msg-1', { sender: 'alice', content: 'Original', messageType: 'RESPONSE' }),
      msg('msg-2', { sender: 'alice', content: '', messageType: 'RESPONSE', correctsMessageId: 'msg-1' }),
    ];
    (el.messages[1] as any).retraction = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((msgs[0] as any).message._retracted).toBe(true);
  });

  it('does not filter messages without correctsMessageId', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [
      msg('msg-1', { sender: 'alice', content: 'Normal message', messageType: 'RESPONSE' }),
      msg('msg-2', { sender: 'bob', content: 'Another message', messageType: 'COMMAND' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const msgs = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect(msgs.length).toBe(2);
  });

  it('dismisses toolbar on Escape key', async () => {
    const el = document.createElement('agency-channel-feed') as any;
    el.messages = [msg('m1', { sender: 'alice' })];
    el.currentActorId = 'alice';
    document.body.appendChild(el);
    await el.updateComplete;

    const msgItem = el.shadowRoot!.querySelector('.message-item') as HTMLElement;
    msgItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('agency-channel-hover-toolbar')).toBeTruthy();

    const feedDiv = el.shadowRoot!.querySelector('.feed') as HTMLElement;
    feedDiv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('agency-channel-hover-toolbar')).toBeNull();
  });
});
