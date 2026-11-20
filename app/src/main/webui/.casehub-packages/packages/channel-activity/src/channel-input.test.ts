import { describe, it, expect, vi, afterEach } from 'vitest';
import { html, render } from 'lit';
import './channel-input.js';
import { ChannelEventTopics } from './events.js';

afterEach(() => { document.body.innerHTML = ''; });

describe('agency-channel-input', () => {
  it('renders a textarea', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('textarea')).toBeTruthy();
  });

  it('emits channel:send-message on Enter', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'hello world';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler).toHaveBeenCalledOnce();
    const detail = handler.mock.calls[0]![0]!.detail;
    expect(detail.topic).toBe(ChannelEventTopics.SEND_MESSAGE);
    expect(detail.payload.content).toBe('hello world');
    expect(detail.payload.channelId).toBe('ch-1');
  });

  it('does not emit on Shift+Enter', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'line one';
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not emit empty messages', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears textarea after sending', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await el.updateComplete;

    expect(textarea.value).toBe('');
  });

  it('shows reply banner when replyTo is set', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.replyTo = { messageId: 'msg-1', senderName: 'agent-alpha' };
    document.body.appendChild(el);
    await el.updateComplete;

    const banner = el.shadowRoot!.querySelector('.reply-banner');
    expect(banner).toBeTruthy();
    expect(banner!.textContent).toContain('agent-alpha');
  });

  it('includes inReplyTo in sent message when replying', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.replyTo = { messageId: 'msg-1', senderName: 'alpha' };
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'reply text';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler.mock.calls[0]![0]!.detail.payload.inReplyTo).toBe('msg-1');
  });

  it('clears replyTo banner on cancel click', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.replyTo = { messageId: 'msg-1', senderName: 'alpha' };
    document.body.appendChild(el);
    await el.updateComplete;

    el.shadowRoot!.querySelector('.reply-cancel')!.click();
    await el.updateComplete;

    expect(el.replyTo).toBeUndefined();
    expect(el.shadowRoot!.querySelector('.reply-banner')).toBeNull();
  });

  // --- Type Selector (Gap #1) ---

  it('type selector hidden by default', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.type-selector')).toBeNull();
  });

  it('type selector shown when showTypeSelector=true', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTypeSelector = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('.type-selector select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(11);
  });

  it('allowedTypes filters the type selector', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTypeSelector = true;
    el.allowedTypes = ['QUERY', 'COMMAND'];
    document.body.appendChild(el);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('.type-selector select') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toEqual(['QUERY', 'COMMAND']);
  });

  it('deniedTypes filters the type selector', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTypeSelector = true;
    el.deniedTypes = ['EVENT'];
    document.body.appendChild(el);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('.type-selector select') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    expect(values).not.toContain('EVENT');
    expect(values.length).toBe(10);
  });

  it('deniedTypes takes precedence over allowedTypes', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTypeSelector = true;
    el.allowedTypes = ['QUERY', 'EVENT'];
    el.deniedTypes = ['EVENT'];
    document.body.appendChild(el);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('.type-selector select') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toEqual(['QUERY']);
  });

  it('speechAct included in payload when type selector is visible', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTypeSelector = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler.mock.calls[0]![0]!.detail.payload.speechAct).toBeTruthy();
  });

  it('speechAct not included when type selector is hidden', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler.mock.calls[0]![0]!.detail.payload.speechAct).toBeUndefined();
  });

  // --- Error Feedback (Gap #4) ---

  it('shows default error when setError called', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    el.setError('Send failed');
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error).toBeTruthy();
    expect(error!.textContent).toBe('Send failed');
  });

  it('uses renderError callback when provided', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.renderError = (msg: string) => html`<div class="custom-error">ERR: ${msg}</div>`;
    document.body.appendChild(el);
    await el.updateComplete;

    el.setError('Network error');
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.custom-error')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.custom-error')!.textContent).toBe('ERR: Network error');
    expect(el.shadowRoot!.querySelector('.error')).toBeNull();
  });

  it('clears error on next send', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    el.setError('Previous error');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.error')).toBeTruthy();

    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'new message';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.error')).toBeNull();
  });

  it('empty and undefined allowedTypes/deniedTypes mean no constraint', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTypeSelector = true;
    el.allowedTypes = [];
    el.deniedTypes = undefined;
    document.body.appendChild(el);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('.type-selector select') as HTMLSelectElement;
    expect(select.options.length).toBe(11);
  });

  // --- Topic Selector ---

  const TOPICS = [
    { id: 't1', channelId: 'ch-1', name: 'General', state: 'ACTIVE' as const, messageCount: 5, createdAt: '2026-01-01T00:00:00Z' },
    { id: 't2', channelId: 'ch-1', name: 'deployment', state: 'ACTIVE' as const, messageCount: 3, createdAt: '2026-01-01T00:00:00Z' },
  ];

  it('shows topic pill when showTopicSelector is true', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTopicSelector = true;
    el.topic = 'General';
    el.topicId = 't1';
    el.topics = TOPICS;
    document.body.appendChild(el);
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.topic-pill');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toContain('General');
  });

  it('hides topic pill when showTopicSelector is false', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTopicSelector = false;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.topic-pill')).toBeNull();
  });

  it('shows escape hatch + button when showTopicSelector is false', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTopicSelector = false;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.new-topic-btn')).not.toBeNull();
  });

  it('hides escape hatch + button when showTopicSelector is true', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTopicSelector = true;
    el.topics = TOPICS;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.new-topic-btn')).toBeNull();
  });

  it('includes topicId in send payload when topic selector is active', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTopicSelector = true;
    el.topicId = 't2';
    el.topic = 'deployment';
    el.topics = TOPICS;
    document.body.appendChild(el);
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'test message';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const payload = handler.mock.calls[0]![0]!.detail.payload;
    expect(payload.topicId).toBe('t2');
  });

  it('shows read-only topic pill when replying', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.showTopicSelector = true;
    el.topic = 'deployment';
    el.topicId = 't2';
    el.topics = TOPICS;
    el.replyTo = { messageId: 'm1', senderName: 'alice' };
    document.body.appendChild(el);
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.topic-pill');
    expect(pill?.classList.contains('read-only')).toBe(true);
  });

  it('renders a visible send button', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.send-btn');
    expect(btn).toBeTruthy();
  });

  it('send button is disabled when textarea is empty', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('send button is enabled when textarea has content', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  // --- Correction editor mode (#34 Batch 4) ---

  it('shows correction banner when correctionTarget is set', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.correctionTarget = { id: 'msg-1', content: 'Old text', sender: 'alice', createdAt: '2026-09-15T14:23:00Z' };
    document.body.appendChild(el);
    await el.updateComplete;
    const banner = el.shadowRoot!.querySelector('.correction-banner');
    expect(banner).toBeTruthy();
    expect(banner!.textContent).toContain('Correcting');
    expect(banner!.textContent).toContain('alice');
  });

  it('pre-fills textarea with original content in correction mode', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.correctionTarget = { id: 'msg-1', content: 'Old text', sender: 'alice', createdAt: '2026-09-15T14:23:00Z' };
    document.body.appendChild(el);
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Old text');
  });

  it('shows checkmark icon on send button in correction mode', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.correctionTarget = { id: 'msg-1', content: 'Old text', sender: 'alice', createdAt: '2026-09-15T14:23:00Z' };
    document.body.appendChild(el);
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.send-btn');
    expect(btn?.getAttribute('aria-label')).toBe('Confirm correction');
  });

  it('emits CORRECT_MESSAGE on send in correction mode', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.correctionTarget = { id: 'msg-1', content: 'Old text', sender: 'alice', createdAt: '2026-09-15T14:23:00Z' };
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'New text';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler).toHaveBeenCalledOnce();
    const detail = handler.mock.calls[0]![0]!.detail;
    expect(detail.topic).toBe(ChannelEventTopics.CORRECT_MESSAGE);
    expect(detail.payload.messageId).toBe('msg-1');
    expect(detail.payload.correctedContent).toBe('New text');
  });

  it('cancels correction mode when cancel button clicked', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.correctionTarget = { id: 'msg-1', content: 'Old text', sender: 'alice', createdAt: '2026-09-15T14:23:00Z' };
    document.body.appendChild(el);
    await el.updateComplete;

    el.shadowRoot!.querySelector('.correction-cancel')!.click();
    await el.updateComplete;

    expect(el.correctionTarget).toBeUndefined();
    expect(el.shadowRoot!.querySelector('.correction-banner')).toBeNull();
  });

  it('cancels correction mode on Escape key', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    el.correctionTarget = { id: 'msg-1', content: 'Old text', sender: 'alice', createdAt: '2026-09-15T14:23:00Z' };
    document.body.appendChild(el);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;

    expect(el.correctionTarget).toBeUndefined();
  });

  it('clicking send button sends the message', async () => {
    const el = document.createElement('agency-channel-input') as any;
    el.channelId = 'ch-1';
    document.body.appendChild(el);
    await el.updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'click send';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector('.send-btn') as HTMLButtonElement;
    btn.click();

    expect(handler).toHaveBeenCalledOnce();
    const detail = handler.mock.calls[0]![0]!.detail;
    expect(detail.topic).toBe(ChannelEventTopics.SEND_MESSAGE);
    expect(detail.payload.content).toBe('click send');
  });
});
