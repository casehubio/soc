import { describe, it, expect, afterEach } from 'vitest';
import './channel-task-panel.js';
import type { QhorusMessage } from './types.js';
import type { CommitmentRecord } from './commitment.js';

function makeMsg(overrides: Partial<QhorusMessage> = {}): QhorusMessage {
  return {
    id: 'm1', channelId: 'ch-1', sender: 'human:alice', messageType: 'COMMAND',
    actorType: 'HUMAN', content: 'Run the compliance check', topic: '',
    replyCount: 0, artefactRefs: [], createdAt: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

describe('agency-channel-task-panel', () => {
  let element: HTMLElement;

  afterEach(() => { element?.remove(); });

  it('renders empty state when no commands', async () => {
    element = document.createElement('agency-channel-task-panel') as any;
    (element as any).messages = [
      makeMsg({ id: 'm1', messageType: 'STATUS' }),
    ];
    (element as any).commitments = new Map();
    document.body.appendChild(element);
    await (element as any).updateComplete;

    expect(element.shadowRoot!.querySelector('.empty')?.textContent).toContain('No commitments');
  });

  it('groups tasks into active, overdue, completed', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();

    element = document.createElement('agency-channel-task-panel') as any;
    (element as any).messages = [
      makeMsg({ id: 'active', correlationId: 'active', content: 'Active task' }),
      makeMsg({ id: 'overdue', correlationId: 'overdue', content: 'Overdue task' }),
      makeMsg({ id: 'done', correlationId: 'done', content: 'Done task' }),
    ];
    const commitments = new Map<string, CommitmentRecord>([
      ['active', { state: 'OPEN', deadline: future, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-07-20T10:00:00Z' }],
      ['overdue', { state: 'OPEN', deadline: past, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-07-20T10:00:00Z' }],
      ['done', { state: 'FULFILLED', createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-07-20T11:00:00Z' }],
    ]);
    (element as any).commitments = commitments;
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const groups = element.shadowRoot!.querySelectorAll('.group-label');
    const labels = Array.from(groups).map(g => g.textContent?.trim());
    expect(labels).toContain('Overdue');
    expect(labels).toContain('Active');
    expect(labels).toContain('Completed');
  });

  it('marks overdue rows with overdue class', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    element = document.createElement('agency-channel-task-panel') as any;
    (element as any).messages = [makeMsg({ id: 'od', correlationId: 'od' })];
    (element as any).commitments = new Map([
      ['od', { state: 'OPEN', deadline: past, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-07-20T10:00:00Z' }],
    ]);
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const row = element.shadowRoot!.querySelector('.task-row');
    expect(row?.classList.contains('overdue')).toBe(true);
  });

  it('emits message-selected event on row click', async () => {
    element = document.createElement('agency-channel-task-panel') as any;
    const msg = makeMsg({ id: 'click-me' });
    (element as any).messages = [msg];
    (element as any).commitments = new Map();
    document.body.appendChild(element);
    await (element as any).updateComplete;

    let emitted: any = null;
    element.addEventListener('pages-event', (e: Event) => { emitted = (e as CustomEvent).detail; });

    const row = element.shadowRoot!.querySelector('.task-row') as HTMLElement;
    row.click();

    expect(emitted).not.toBeNull();
    expect(emitted.payload.message.id).toBe('click-me');
  });
});
