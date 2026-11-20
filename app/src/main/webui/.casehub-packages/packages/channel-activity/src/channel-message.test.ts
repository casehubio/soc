import { describe, it, expect, afterEach, vi } from 'vitest';
import './channel-message.js';
import './channel-reaction-bar.js';
import type { QhorusMessage } from './types.js';
import { ChannelEventTopics } from './events.js';

function makeMessage(overrides: Partial<QhorusMessage> = {}): QhorusMessage {
  return {
    id: 'msg-1',
    channelId: 'ch-1',
    sender: 'agent-alpha',
    messageType: 'EVENT',
    actorType: 'AGENT',
    content: 'Hello world',
    topic: 'General',
    replyCount: 0,
    artefactRefs: [],
    createdAt: '2026-07-07T12:00:00Z',
    ...overrides,
  };
}

async function renderMessage(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const el = document.createElement('agency-channel-message') as any;
  el.message = makeMessage(props.message as any);
  if (props.reactions) el.reactions = props.reactions;
  if (props.showSpeechAct !== undefined) el.showSpeechAct = props.showSpeechAct;
  if (props.showActorBadge !== undefined) el.showActorBadge = props.showActorBadge;
  if (props.parentMessage) el.parentMessage = props.parentMessage;
  if (props.channelName) el.channelName = props.channelName;
  if (props.commitmentState) el.commitmentState = props.commitmentState;
  if (props.formatSender) el.formatSender = props.formatSender;
  if (props.renderContent) el.renderContent = props.renderContent;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('agency-channel-message', () => {
  it('renders sender name', async () => {
    const el = await renderMessage();
    const shadow = el.shadowRoot!;
    expect(shadow.textContent).toContain('agent-alpha');
  });

  it('renders message content as markdown', async () => {
    const el = await renderMessage({ message: { content: '**bold** text' } });
    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('<strong>bold</strong>');
  });

  it('renders colored left border instead of speech act badge', async () => {
    const el = await renderMessage({ message: { messageType: 'COMMAND' } });
    const badge = el.shadowRoot!.querySelector('.speech-act-badge');
    expect(badge).toBeNull();
    const container = el.shadowRoot!.querySelector('.message-container');
    expect(container).toBeTruthy();
    const style = container!.getAttribute('style');
    expect(style).toContain('border-left');
  });

  it('includes aria-label with speech act type', async () => {
    const el = await renderMessage({ message: { messageType: 'COMMAND' } });
    const container = el.shadowRoot!.querySelector('.message-container');
    expect(container?.getAttribute('aria-label')).toContain('COMMAND');
  });

  it('includes title tooltip with speech act type', async () => {
    const el = await renderMessage({ message: { messageType: 'COMMAND' } });
    const container = el.shadowRoot!.querySelector('.message-container');
    expect(container?.getAttribute('title')).toBe('COMMAND');
  });

  it('renders actor icon by default', async () => {
    const el = await renderMessage({ message: { actorType: 'AGENT' } });
    const icon = el.shadowRoot!.querySelector('.actor-icon');
    expect(icon).toBeTruthy();
    expect(icon!.getAttribute('data-actor')).toBe('AGENT');
  });

  it('hides actor icon when showActorBadge=false', async () => {
    const el = await renderMessage({ showActorBadge: false });
    const icon = el.shadowRoot!.querySelector('.actor-icon');
    expect(icon).toBeNull();
  });

  it('applies colored left border for each message type', async () => {
    for (const type of ['COMMAND', 'DONE', 'FAILURE', 'DECLINE', 'HANDOFF', 'EVENT', 'QUERY', 'RESPONSE', 'STATUS', 'PROPOSE', 'JUDGMENT'] as const) {
      const el = await renderMessage({ message: { messageType: type } });
      const container = el.shadowRoot!.querySelector('.message-container');
      expect(container, `${type} should have a message-container`).toBeTruthy();
      const style = container!.getAttribute('style');
      expect(style, `${type} should have border-left style`).toContain('border-left');
      document.body.innerHTML = '';
    }
  });

  it('renders commitment state badge in expanded section for COMMAND messages', async () => {
    const el = await renderMessage({ message: { messageType: 'COMMAND', commitmentId: 'c-1' } });
    (el as any).commitmentState = 'OPEN';
    await (el as any).updateComplete;
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;
    const badge = el.shadowRoot!.querySelector('.expanded-section pages-status-badge');
    expect(badge).toBeTruthy();
    expect((badge as any).state).toBe('OPEN');
  });

  it('renders delegation indicator for HANDOFF messages', async () => {
    const el = await renderMessage({ message: { messageType: 'HANDOFF', target: 'agent-beta', sender: 'agent-alpha' } });
    const delegation = el.shadowRoot!.querySelector('.delegation-indicator');
    expect(delegation).toBeTruthy();
    expect(delegation!.textContent).toContain('agent-beta');
  });

  it('renders artefact chips when artefactRefs present', async () => {
    const el = await renderMessage({
      message: { artefactRefs: [{ uri: 'doc:spec.md', type: 'DOCUMENT', label: 'Design Spec' }] },
    });
    const chip = el.shadowRoot!.querySelector('.artefact-chip');
    expect(chip).toBeTruthy();
    expect(chip!.textContent).toContain('Design Spec');
  });

  it('renders nothing when message is not set', async () => {
    const el = document.createElement('agency-channel-message') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.message-header')).toBeNull();
  });

  it('renders channel-reaction-bar', async () => {
    const el = await renderMessage();
    const bar = el.shadowRoot!.querySelector('agency-channel-reaction-bar');
    expect(bar).toBeTruthy();
  });

  it('renders relative timestamp', async () => {
    const el = await renderMessage();
    const time = el.shadowRoot!.querySelector('time');
    expect(time).toBeTruthy();
    expect(time!.getAttribute('datetime')).toBe('2026-07-07T12:00:00Z');
  });

  it('hides expand toggle on message with no expandable content', async () => {
    const el = await renderMessage();
    const toggle = el.shadowRoot!.querySelector('.expand-toggle');
    expect(toggle).toBeNull();
  });

  it('shows expand toggle when artefactRefs present', async () => {
    const el = await renderMessage({
      message: { artefactRefs: [{ uri: 'doc:spec.md', type: 'DOCUMENT', label: 'Spec' }] },
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle');
    expect(toggle).toBeTruthy();
  });

  it('shows expand toggle when commitmentId present', async () => {
    const el = await renderMessage({
      message: { messageType: 'COMMAND', commitmentId: 'c-123' },
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle');
    expect(toggle).toBeTruthy();
  });

  it('shows expand toggle when correlationId present', async () => {
    const el = await renderMessage({
      message: { correlationId: 'corr-1' },
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle');
    expect(toggle).toBeTruthy();
  });

  it('expand toggle works when expandable', async () => {
    const el = await renderMessage({
      message: { commitmentId: 'c-1', messageType: 'COMMAND' },
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await (el as any).updateComplete;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.shadowRoot!.querySelector('.expanded-section')).toBeTruthy();
  });

  it('expanded section has no action bar (reply moved to hover toolbar)', async () => {
    const el = await renderMessage({
      message: { commitmentId: 'c-1', messageType: 'COMMAND' },
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;

    const actionBar = el.shadowRoot!.querySelector('.action-bar');
    expect(actionBar).toBeNull();
  });

  it('collapses on Escape key', async () => {
    const el = await renderMessage({
      message: { commitmentId: 'c-1', messageType: 'COMMAND' },
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.expanded-section')).toBeNull();
  });

  // --- formatSender extension point ---

  it('uses formatSender callback for sender display', async () => {
    const formatSender = vi.fn((s: string) => s.replace('agent-', 'A:'));
    const el = await renderMessage({ formatSender });
    const sender = el.shadowRoot!.querySelector('.sender');
    expect(sender!.textContent).toBe('A:alpha');
    expect(formatSender).toHaveBeenCalledWith('agent-alpha', 'AGENT');
  });

  it('uses identity function as default formatSender', async () => {
    const el = await renderMessage();
    const sender = el.shadowRoot!.querySelector('.sender');
    expect(sender!.textContent).toBe('agent-alpha');
  });

  it('applies formatSender in expanded correlation context', async () => {
    const parent = makeMessage({ id: 'parent-1', sender: 'claudony-worker-bob', actorType: 'AGENT', content: 'Original question' });
    const formatSender = (s: string) => s.replace('claudony-worker-', '');
    const el = await renderMessage({
      message: { inReplyTo: 'parent-1', correlationId: 'corr-1' },
      parentMessage: parent,
      formatSender,
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;
    const ctx = el.shadowRoot!.querySelector('.correlation-context .parent-sender');
    expect(ctx!.textContent).toBe('bob');
  });

  // --- renderContent extension point ---

  it('uses renderContent callback when it returns a TemplateResult', async () => {
    const { html: litHtml } = await import('lit');
    const renderContent = vi.fn((m: QhorusMessage) =>
      litHtml`<span class="custom">${m.messageType}: ${m.content}</span>`
    );
    const el = await renderMessage({ renderContent });
    const custom = el.shadowRoot!.querySelector('.custom');
    expect(custom).toBeTruthy();
    expect(custom!.textContent).toBe('EVENT: Hello world');
    expect(renderContent).toHaveBeenCalledOnce();
  });

  it('falls back to markdown when renderContent returns undefined', async () => {
    const renderContent = vi.fn(() => undefined);
    const el = await renderMessage({ message: { content: '**bold** text' }, renderContent });
    expect(el.shadowRoot!.innerHTML).toContain('<strong>bold</strong>');
    expect(renderContent).toHaveBeenCalledOnce();
  });

  it('uses default markdown rendering when renderContent is not set', async () => {
    const el = await renderMessage({ message: { content: '**bold** text' } });
    expect(el.shadowRoot!.innerHTML).toContain('<strong>bold</strong>');
  });

  it('passes full message object to renderContent', async () => {
    const { html: litHtml } = await import('lit');
    const renderContent = vi.fn((m: QhorusMessage) =>
      litHtml`<span class="custom">${m.sender}-${m.channelId}</span>`
    );
    const el = await renderMessage({ renderContent });
    const custom = el.shadowRoot!.querySelector('.custom');
    expect(custom!.textContent).toBe('agent-alpha-ch-1');
  });

  // --- Correction markers (#34 Batch 4) ---

  it('shows (corrected) marker when message has _corrected flag', async () => {
    const el = await renderMessage({ message: { _corrected: true } as any });
    const marker = el.shadowRoot!.querySelector('.corrected-marker');
    expect(marker).toBeTruthy();
    expect(marker!.textContent!.trim()).toBe('(corrected)');
  });

  it('does not show (corrected) marker on normal messages', async () => {
    const el = await renderMessage();
    const marker = el.shadowRoot!.querySelector('.corrected-marker');
    expect(marker).toBeNull();
  });

  it('shows expand toggle when _corrections are present', async () => {
    const el = await renderMessage({
      message: {
        _corrected: true,
        _corrections: [makeMessage({ id: 'c-1', content: 'Fixed text' })],
      } as any,
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle');
    expect(toggle).toBeTruthy();
  });

  it('renders correction history in expanded section', async () => {
    const el = await renderMessage({
      message: {
        _corrected: true,
        _corrections: [
          makeMessage({ id: 'c-1', content: 'Fixed text', createdAt: '2026-09-15T14:25:00Z' }),
        ],
      } as any,
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;
    const history = el.shadowRoot!.querySelector('.correction-history');
    expect(history).toBeTruthy();
    expect(history!.textContent).toContain('Fixed text');
  });

  it('renders retraction tombstone when _retracted is true', async () => {
    const el = await renderMessage({
      message: { _retracted: true, sender: 'alice', content: 'Original sensitive text' } as any,
    });
    const tombstone = el.shadowRoot!.querySelector('.retraction-tombstone');
    expect(tombstone).toBeTruthy();
    expect(tombstone!.textContent).toContain('Retracted');
    const content = el.shadowRoot!.querySelector('.content');
    expect(content).toBeNull();
  });

  it('clicking artefact chip dispatches artefact-selected event', async () => {
    const el = await renderMessage({
      message: makeMessage({
        artefactRefs: [{ uri: 'doc://spec', type: 'DOCUMENT', label: 'Spec' }],
      }),
    });

    let receivedRef: any = null;
    el.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail.topic === ChannelEventTopics.ARTEFACT_SELECTED) {
        receivedRef = e.detail.payload.artefactRef;
      }
    }) as EventListener);

    const chip = el.shadowRoot!.querySelector('.artefact-chip') as HTMLElement;
    chip.click();
    expect(receivedRef).toBeTruthy();
    expect(receivedRef.uri).toBe('doc://spec');
    expect(receivedRef.type).toBe('DOCUMENT');
  });

  it('artefact chip shows type icon', async () => {
    const el = await renderMessage({
      message: makeMessage({
        artefactRefs: [{ uri: 'code://file.ts', type: 'CODE', label: 'file.ts' }],
      }),
    });

    const chip = el.shadowRoot!.querySelector('.artefact-chip');
    expect(chip?.textContent).toContain('🔧');
    expect(chip?.textContent).toContain('file.ts');
  });
});
