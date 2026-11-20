import { describe, it, expect, afterEach } from 'vitest';
import './channel-correlation-panel.js';
import type { QhorusMessage } from './types.js';

function makeMsg(overrides: Partial<QhorusMessage> = {}): QhorusMessage {
  return {
    id: 'm1', channelId: 'ch-1', sender: 'human:alice', messageType: 'COMMAND',
    actorType: 'HUMAN', content: 'Review the case', topic: '',
    replyCount: 0, artefactRefs: [], createdAt: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

describe('agency-channel-correlation-panel', () => {
  let element: HTMLElement;

  afterEach(() => { element?.remove(); });

  it('shows empty state when no message selected', async () => {
    element = document.createElement('agency-channel-correlation-panel') as any;
    (element as any).messages = [];
    (element as any).commitments = new Map();
    document.body.appendChild(element);
    await (element as any).updateComplete;

    expect(element.shadowRoot!.querySelector('.empty')?.textContent).toContain('Select a message');
  });

  it('builds chain from correlationId', async () => {
    element = document.createElement('agency-channel-correlation-panel') as any;
    (element as any).messages = [
      makeMsg({ id: 'm1', correlationId: 'corr-1', sender: 'human:alice', messageType: 'COMMAND', createdAt: '2026-07-20T10:00:00Z' }),
      makeMsg({ id: 'm2', correlationId: 'corr-1', sender: 'agent-1', messageType: 'STATUS', createdAt: '2026-07-20T10:01:00Z' }),
      makeMsg({ id: 'm3', correlationId: 'corr-1', sender: 'agent-1', messageType: 'DONE', createdAt: '2026-07-20T10:02:00Z' }),
      makeMsg({ id: 'unrelated', correlationId: 'corr-2', sender: 'agent-2', messageType: 'STATUS' }),
    ];
    (element as any).commitments = new Map();
    (element as any).selectedMessageId = 'm1';
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const nodes = element.shadowRoot!.querySelectorAll('.flow-node');
    expect(nodes.length).toBe(3);
  });

  it('builds chain from inReplyTo', async () => {
    element = document.createElement('agency-channel-correlation-panel') as any;
    (element as any).messages = [
      makeMsg({ id: 'm1', sender: 'human:alice', messageType: 'COMMAND', createdAt: '2026-07-20T10:00:00Z' }),
      makeMsg({ id: 'm2', inReplyTo: 'm1', sender: 'agent-1', messageType: 'RESPONSE', createdAt: '2026-07-20T10:01:00Z' }),
    ];
    (element as any).commitments = new Map();
    (element as any).selectedMessageId = 'm2';
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const nodes = element.shadowRoot!.querySelectorAll('.flow-node');
    expect(nodes.length).toBe(2);
  });

  it('shows duration between nodes', async () => {
    element = document.createElement('agency-channel-correlation-panel') as any;
    (element as any).messages = [
      makeMsg({ id: 'm1', correlationId: 'corr-1', createdAt: '2026-07-20T10:00:00Z' }),
      makeMsg({ id: 'm2', correlationId: 'corr-1', createdAt: '2026-07-20T10:05:00Z' }),
    ];
    (element as any).commitments = new Map();
    (element as any).selectedMessageId = 'm1';
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const duration = element.shadowRoot!.querySelector('.flow-duration');
    expect(duration?.textContent).toContain('5m');
  });

  it('emits message-selected on node click', async () => {
    element = document.createElement('agency-channel-correlation-panel') as any;
    const msg = makeMsg({ id: 'click-me', correlationId: 'corr-1' });
    (element as any).messages = [msg];
    (element as any).commitments = new Map();
    (element as any).selectedMessageId = 'click-me';
    document.body.appendChild(element);
    await (element as any).updateComplete;

    let emitted: any = null;
    element.addEventListener('pages-event', (e: Event) => { emitted = (e as CustomEvent).detail; });

    const node = element.shadowRoot!.querySelector('.flow-node') as HTMLElement;
    node.click();

    expect(emitted).not.toBeNull();
    expect(emitted.payload.message.id).toBe('click-me');
  });
});
