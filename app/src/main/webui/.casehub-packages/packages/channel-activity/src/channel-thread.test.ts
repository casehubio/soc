import { describe, it, expect, afterEach, vi } from 'vitest';
import { html } from 'lit';
import './channel-thread.js';
import './channel-message.js';
import type { QhorusMessage } from './types.js';

function msg(id: string, type: string, content: string): QhorusMessage {
  return {
    id, channelId: 'ch-1', sender: 'agent-a', messageType: type as any,
    actorType: 'AGENT', content, topic: 'General', replyCount: 0, artefactRefs: [],
    createdAt: '2026-07-07T12:00:00Z',
  };
}

afterEach(() => { document.body.innerHTML = ''; });

describe('agency-channel-thread', () => {
  it('renders root message and reply count when collapsed', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Analyze auth');
    el.replies = [msg('2', 'STATUS', 'Reading files'), msg('3', 'DONE', 'Complete')];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('agency-channel-message')).toBeTruthy();
    expect(shadow.textContent).toContain('2 replies');
    expect(shadow.querySelectorAll('.reply agency-channel-message').length).toBe(0);
  });

  it('renders all replies when expanded', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Analyze auth');
    el.replies = [msg('2', 'STATUS', 'Reading'), msg('3', 'DONE', 'Done')];
    el.collapsed = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect(messages.length).toBe(3);
  });

  it('toggles collapse on header click', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    el.shadowRoot!.querySelector('.thread-toggle')!.click();
    await el.updateComplete;

    expect(el.collapsed).toBe(false);
    expect(el.shadowRoot!.querySelectorAll('agency-channel-message').length).toBe(2);
  });

  it('shows commitment state on header', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'STATUS', 'Working')];
    el.commitmentState = 'FULFILLED';
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector('pages-status-badge');
    expect(pill).toBeTruthy();
    expect((pill as any).state).toBe('FULFILLED');
  });

  it('renders nothing when rootMessage is not set', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    const message = el.shadowRoot!.querySelector('agency-channel-message');
    expect(message).toBeNull();
  });

  it('shows "1 reply" for singular reply count', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.thread-toggle');
    expect(toggle!.textContent).toContain('1 reply');
  });

  it('aria-expanded is false when collapsed', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.thread-toggle');
    expect(toggle!.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders pages-status-badge with correct state for FULFILLED', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.commitmentState = 'FULFILLED';
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector('pages-status-badge') as any;
    expect(pill).toBeTruthy();
    expect(pill.state).toBe('FULFILLED');
  });

  // --- renderContent passthrough ---

  it('passes renderContent to root channel-message', async () => {
    const renderContent = vi.fn(() => html`<span class="custom">custom</span>`);
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [];
    el.renderContent = renderContent;
    document.body.appendChild(el);
    await el.updateComplete;

    const msgEl = el.shadowRoot!.querySelector('agency-channel-message') as any;
    expect(msgEl.renderContent).toBe(renderContent);
  });

  it('passes renderContent to reply channel-messages', async () => {
    const renderContent = vi.fn(() => undefined);
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.renderContent = renderContent;
    el.collapsed = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((messages[1] as any).renderContent).toBe(renderContent);
  });

  // --- formatSender passthrough ---

  it('passes formatSender to channel-message elements', async () => {
    const formatSender = vi.fn((s: string) => s.toUpperCase());
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.formatSender = formatSender;
    el.collapsed = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((messages[0] as any).formatSender).toBe(formatSender);
    expect((messages[1] as any).formatSender).toBe(formatSender);
  });

  // --- selectedMessageId auto-expand ---

  it('auto-expands when selectedMessageId matches a reply', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('root', 'COMMAND', 'Task');
    el.replies = [msg('reply1', 'STATUS', 'Working'), msg('reply2', 'DONE', 'Done')];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.collapsed).toBe(true);
    expect(el.shadowRoot!.querySelectorAll('.reply agency-channel-message').length).toBe(0);

    el.selectedMessageId = 'reply1';
    await el.updateComplete;

    expect(el.collapsed).toBe(false);
    expect(el.shadowRoot!.querySelectorAll('.reply agency-channel-message').length).toBe(2);
  });

  it('highlights the selected reply within the thread', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('root', 'COMMAND', 'Task');
    el.replies = [msg('reply1', 'STATUS', 'Working'), msg('reply2', 'DONE', 'Done')];
    el.collapsed = false;
    el.selectedMessageId = 'reply2';
    document.body.appendChild(el);
    await el.updateComplete;

    const replyDivs = el.shadowRoot!.querySelectorAll('.reply');
    expect(replyDivs[0].classList.contains('selected')).toBe(false);
    expect(replyDivs[1].classList.contains('selected')).toBe(true);
  });

  it('highlights the root message when selectedMessageId matches root', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('root', 'COMMAND', 'Task');
    el.replies = [msg('reply1', 'DONE', 'Done')];
    el.selectedMessageId = 'root';
    el.collapsed = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const rootMsg = el.shadowRoot!.querySelector('.root-message');
    expect(rootMsg).toBeTruthy();
    expect(rootMsg.classList.contains('selected')).toBe(true);
  });

  it('does not auto-expand when selectedMessageId matches root', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('root', 'COMMAND', 'Task');
    el.replies = [msg('reply1', 'DONE', 'Done')];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    el.selectedMessageId = 'root';
    await el.updateComplete;

    expect(el.collapsed).toBe(true);
  });

  it('uses identity formatSender by default when none is set', async () => {
    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [msg('2', 'DONE', 'Done')];
    el.collapsed = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('agency-channel-message');
    expect((messages[0] as any).formatSender('alice', 'AGENT')).toBe('alice');
    expect((messages[1] as any).formatSender('bob', 'HUMAN')).toBe('bob');
  });

  // --- Thread age/activity indicator (#17) ---

  it('shows last activity time in thread header', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:05:00Z'));

    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [
      { ...msg('2', 'STATUS', 'Working'), createdAt: '2026-07-07T12:03:00Z' },
      { ...msg('3', 'DONE', 'Done'), createdAt: '2026-07-07T12:04:00Z' },
    ];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const age = el.shadowRoot!.querySelector('.thread-age');
    expect(age).toBeTruthy();
    expect(age!.textContent!.trim()).toBe('1m ago');

    vi.useRealTimers();
  });

  it('shows hours for older threads', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T15:00:00Z'));

    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = { ...msg('1', 'COMMAND', 'Task'), createdAt: '2026-07-07T12:00:00Z' };
    el.replies = [
      { ...msg('2', 'DONE', 'Done'), createdAt: '2026-07-07T13:00:00Z' },
    ];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const age = el.shadowRoot!.querySelector('.thread-age');
    expect(age!.textContent!.trim()).toBe('2h ago');

    vi.useRealTimers();
  });

  it('shows days for threads older than 24h', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));

    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = { ...msg('1', 'COMMAND', 'Task'), createdAt: '2026-07-07T12:00:00Z' };
    el.replies = [
      { ...msg('2', 'DONE', 'Done'), createdAt: '2026-07-08T12:00:00Z' },
    ];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const age = el.shadowRoot!.querySelector('.thread-age');
    expect(age!.textContent!.trim()).toBe('2d ago');

    vi.useRealTimers();
  });

  it('uses root message time when no replies exist', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:10:00Z'));

    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = { ...msg('1', 'COMMAND', 'Task'), createdAt: '2026-07-07T12:00:00Z' };
    el.replies = [];
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-age')).toBeNull();
  });

  it('shows "just now" for very recent activity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:30Z'));

    const el = document.createElement('agency-channel-thread') as any;
    el.rootMessage = msg('1', 'COMMAND', 'Task');
    el.replies = [
      { ...msg('2', 'DONE', 'Done'), createdAt: '2026-07-07T12:00:00Z' },
    ];
    el.collapsed = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const age = el.shadowRoot!.querySelector('.thread-age');
    expect(age!.textContent!.trim()).toBe('just now');

    vi.useRealTimers();
  });
});
