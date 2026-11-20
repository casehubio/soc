import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ConversationPoint } from './types.js';
import './blocks-point-list.js';

type ListElement = HTMLElement & {
  points: ConversationPoint[];
  currentRound: number;
  selectionTopic: string;
  updateComplete: Promise<boolean>;
};

const MOCK_POINTS: ConversationPoint[] = [
  {
    id: 'p1', topic: 'Auth scoping', round: 1,
    classification: { priority: 'HIGH', scope: 'ARCHITECTURE' },
    entries: [{ entryType: 'RAISE', content: 'Auth needs scoping', agentRole: 'REV', round: 1 }],
    status: 'OPEN',
  },
  {
    id: 'p2', topic: 'Error model', round: 1,
    classification: { priority: 'MEDIUM', scope: 'API' },
    entries: [
      { entryType: 'RAISE', content: 'Error model', agentRole: 'REV', round: 1 },
      { entryType: 'AGREE', content: 'Agreed', agentRole: 'IMP', round: 2 },
    ],
    status: 'AGREED',
  },
  {
    id: 'p3', topic: 'Cache TTL', round: 3,
    classification: { priority: 'HIGH', scope: 'PERFORMANCE', location: 'cache.ts' },
    entries: [{ entryType: 'RAISE', content: 'TTL too long', agentRole: 'REV', round: 3 }],
    status: 'DISPUTED',
  },
];

function createElement(): ListElement {
  const el = document.createElement('blocks-point-list') as ListElement;
  document.body.appendChild(el);
  return el;
}

describe('blocks-point-list', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders point rows', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    await el.updateComplete;
    const rows = el.shadowRoot?.querySelectorAll('.point-item');
    expect(rows?.length).toBe(3);
  });

  it('groups by round with dividers', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    await el.updateComplete;
    const dividers = el.shadowRoot?.querySelectorAll('.round-divider');
    expect(dividers?.length).toBe(2);
    expect(dividers?.[0]?.textContent).toContain('Round 1');
    expect(dividers?.[1]?.textContent).toContain('Round 3');
  });

  it('shows point topic', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    await el.updateComplete;
    const topics = el.shadowRoot?.querySelectorAll('.point-topic');
    expect(topics?.[0]?.textContent).toContain('Auth scoping');
  });

  it('shows entry count', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    await el.updateComplete;
    const secondRow = el.shadowRoot?.querySelectorAll('.point-item')?.[1];
    expect(secondRow?.textContent).toContain('2 entries');
  });

  it('shows classification badges', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    await el.updateComplete;
    const firstItem = el.shadowRoot?.querySelector('.point-item');
    const badges = firstItem?.querySelectorAll('.badge');
    const texts = Array.from(badges ?? []).map(b => b.textContent?.trim());
    expect(texts).toContain('HIGH');
    expect(texts).toContain('ARCHITECTURE');
  });

  it('shows location badge when present', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    await el.updateComplete;
    const thirdRow = el.shadowRoot?.querySelectorAll('.point-item')?.[2];
    expect(thirdRow?.textContent).toContain('cache.ts');
  });

  it('emits selection event on click', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    el.selectionTopic = 'conversation-point';
    await el.updateComplete;
    const listener = vi.fn();
    document.addEventListener('pages-event', listener);
    const row = el.shadowRoot?.querySelector('.point-item') as HTMLElement;
    row?.click();
    expect(listener).toHaveBeenCalled();
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('conversation-point:selected');
    expect(detail.payload.pointId).toBe('p1');
    document.removeEventListener('pages-event', listener);
  });

  it('emits deselection on second click', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    el.selectionTopic = 'conversation-point';
    await el.updateComplete;
    const listener = vi.fn();
    document.addEventListener('pages-event', listener);
    const row = el.shadowRoot?.querySelector('.point-item') as HTMLElement;
    row?.click();
    row?.click();
    const topics = listener.mock.calls.map((c: unknown[]) => ((c as [CustomEvent])[0]).detail.topic);
    expect(topics).toContain('conversation-point:deselected');
    document.removeEventListener('pages-event', listener);
  });

  it('highlights selected point', async () => {
    const el = createElement();
    el.points = MOCK_POINTS;
    el.selectionTopic = 'conversation-point';
    await el.updateComplete;
    const row = el.shadowRoot?.querySelector('.point-item') as HTMLElement;
    row?.click();
    await el.updateComplete;
    expect(row.classList.contains('selected')).toBe(true);
  });

  it('renders empty list gracefully', async () => {
    const el = createElement();
    el.points = [];
    await el.updateComplete;
    const rows = el.shadowRoot?.querySelectorAll('.point-item');
    expect(rows?.length).toBe(0);
  });
});
