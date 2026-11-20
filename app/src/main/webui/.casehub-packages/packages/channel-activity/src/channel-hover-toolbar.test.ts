import { describe, it, expect, vi, afterEach } from 'vitest';
import './channel-hover-toolbar.js';
import type { QhorusMessage } from './types.js';
import { ChannelEventTopics } from './events.js';

function makeMessage(overrides: Partial<QhorusMessage> = {}): QhorusMessage {
  return {
    id: 'msg-1',
    channelId: 'ch-1',
    sender: 'alice',
    messageType: 'RESPONSE',
    actorType: 'HUMAN',
    content: 'Hello world',
    topic: 'General',
    replyCount: 0,
    artefactRefs: [],
    createdAt: '2026-07-07T12:00:00Z',
    ...overrides,
  };
}

async function renderToolbar(props: { message?: Partial<QhorusMessage>; currentActorId?: string } = {}): Promise<HTMLElement> {
  const el = document.createElement('agency-channel-hover-toolbar') as any;
  el.message = makeMessage(props.message);
  el.currentActorId = props.currentActorId ?? 'alice';
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('agency-channel-hover-toolbar', () => {
  it('renders three action buttons', async () => {
    const el = await renderToolbar();
    const buttons = el.shadowRoot!.querySelectorAll('.toolbar-btn');
    expect(buttons.length).toBe(3);
  });

  it('opens emoji picker on react button click', async () => {
    const el = await renderToolbar();
    const reactBtn = el.shadowRoot!.querySelector('.toolbar-btn.react') as HTMLButtonElement;
    reactBtn.click();
    await (el as any).updateComplete;
    const picker = el.shadowRoot!.querySelector('agency-channel-emoji-picker');
    expect(picker).toBeTruthy();
  });

  it('closes emoji picker on second react button click', async () => {
    const el = await renderToolbar();
    const reactBtn = el.shadowRoot!.querySelector('.toolbar-btn.react') as HTMLButtonElement;
    reactBtn.click();
    await (el as any).updateComplete;
    reactBtn.click();
    await (el as any).updateComplete;
    const picker = el.shadowRoot!.querySelector('agency-channel-emoji-picker');
    expect(picker).toBeNull();
  });

  it('emits channel:react with emoji when emoji selected from picker', async () => {
    const el = await renderToolbar();
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const reactBtn = el.shadowRoot!.querySelector('.toolbar-btn.react') as HTMLButtonElement;
    reactBtn.click();
    await (el as any).updateComplete;
    const picker = el.shadowRoot!.querySelector('agency-channel-emoji-picker')!;
    picker.dispatchEvent(new CustomEvent('emoji-selected', { bubbles: true, composed: true, detail: { emoji: '👍' } }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.REACT);
    expect(handler.mock.calls[0]![0]!.detail.payload.messageId).toBe('msg-1');
    expect(handler.mock.calls[0]![0]!.detail.payload.emoji).toBe('👍');
  });

  it('emits channel:message-selected on reply button click', async () => {
    const el = await renderToolbar();
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const replyBtn = el.shadowRoot!.querySelector('.toolbar-btn.reply') as HTMLButtonElement;
    replyBtn.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.MESSAGE_SELECTED);
  });

  it('opens overflow menu on more button click', async () => {
    const el = await renderToolbar();
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const overflow = el.shadowRoot!.querySelector('.overflow-menu');
    expect(overflow).toBeTruthy();
  });

  it('shows Correct in overflow for own messages', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const correctItem = el.shadowRoot!.querySelector('[data-action="correct"]');
    expect(correctItem).toBeTruthy();
  });

  it('hides Correct for SYSTEM messages', async () => {
    const el = await renderToolbar({ message: { sender: 'system', actorType: 'SYSTEM' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const correctItem = el.shadowRoot!.querySelector('[data-action="correct"]');
    expect(correctItem).toBeNull();
  });

  it('hides Correct for other users messages', async () => {
    const el = await renderToolbar({ message: { sender: 'bob' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const correctItem = el.shadowRoot!.querySelector('[data-action="correct"]');
    expect(correctItem).toBeNull();
  });

  it('shows Retract for own messages', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const retractItem = el.shadowRoot!.querySelector('[data-action="retract"]');
    expect(retractItem).toBeTruthy();
  });

  it('hides Retract for other users messages', async () => {
    const el = await renderToolbar({ message: { sender: 'bob' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const retractItem = el.shadowRoot!.querySelector('[data-action="retract"]');
    expect(retractItem).toBeNull();
  });

  it('emits correct-message event from overflow', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const correctItem = el.shadowRoot!.querySelector('[data-action="correct"]') as HTMLButtonElement;
    correctItem.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.CORRECT_MESSAGE);
    expect(handler.mock.calls[0]![0]!.detail.payload.messageId).toBe('msg-1');
  });

  it('emits retract-message event from overflow after confirmation', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const retractItem = el.shadowRoot!.querySelector('[data-action="retract"]') as HTMLButtonElement;
    retractItem.click();
    await (el as any).updateComplete;
    const confirmBtn = el.shadowRoot!.querySelector('.retract-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.RETRACT_MESSAGE);
  });

  // --- Retraction confirmation (#34 Batch 4) ---

  it('shows confirmation dialog instead of immediate retract', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const retractItem = el.shadowRoot!.querySelector('[data-action="retract"]') as HTMLButtonElement;
    retractItem.click();
    await (el as any).updateComplete;

    expect(handler).not.toHaveBeenCalled();
    const confirm = el.shadowRoot!.querySelector('.retract-confirm');
    expect(confirm).toBeTruthy();
    expect(confirm!.textContent).toContain('Retract this message');
  });

  it('dispatches retract-message on confirm click', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const retractItem = el.shadowRoot!.querySelector('[data-action="retract"]') as HTMLButtonElement;
    retractItem.click();
    await (el as any).updateComplete;

    const confirmBtn = el.shadowRoot!.querySelector('.retract-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.RETRACT_MESSAGE);
  });

  it('dismisses confirmation on cancel click', async () => {
    const el = await renderToolbar({ message: { sender: 'alice' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    const retractItem = el.shadowRoot!.querySelector('[data-action="retract"]') as HTMLButtonElement;
    retractItem.click();
    await (el as any).updateComplete;

    const cancelBtn = el.shadowRoot!.querySelector('.retract-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.retract-confirm')).toBeNull();
  });

  it('always shows Copy text and View details in overflow', async () => {
    const el = await renderToolbar({ message: { sender: 'bob' }, currentActorId: 'alice' });
    const moreBtn = el.shadowRoot!.querySelector('.toolbar-btn.more') as HTMLButtonElement;
    moreBtn.click();
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[data-action="details"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="copy"]')).toBeTruthy();
  });
});
