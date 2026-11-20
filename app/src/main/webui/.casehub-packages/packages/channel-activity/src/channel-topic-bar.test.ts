import { describe, it, expect, vi, afterEach } from 'vitest';
import type { QhorusTopic } from './types.js';
import './channel-topic-bar.js';

function makeTopic(overrides: Partial<QhorusTopic> = {}): QhorusTopic {
  return {
    id: 'topic-1', channelId: 'ch-1', name: 'General', state: 'ACTIVE',
    messageCount: 5, createdAt: '2026-01-01T00:00:00Z', ...overrides,
  };
}

async function createElement(topics: QhorusTopic[], selectedTopicId: string | null = null, viewMode: 'flat' | 'threaded' | 'topics' = 'flat') {
  const el = document.createElement('agency-channel-topic-bar') as any;
  el.topics = topics;
  el.selectedTopicId = selectedTopicId;
  el.viewMode = viewMode;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('ChannelTopicBarElement', () => {
  it('renders "All" pill first', async () => {
    const el = await createElement([makeTopic()]);
    const pills = el.shadowRoot!.querySelectorAll('.topic-pill');
    expect(pills.length).toBeGreaterThanOrEqual(1);
    expect(pills[0]?.textContent).toContain('All');
  });

  it('renders topic pills for each non-MERGED topic', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'General' }),
      makeTopic({ id: 't2', name: 'deployment' }),
      makeTopic({ id: 't3', name: 'merged', state: 'MERGED' }),
    ]);
    const pills = el.shadowRoot!.querySelectorAll('.topic-pill');
    expect(pills.length).toBe(3); // All + General + deployment (MERGED excluded)
  });

  it('sorts ACTIVE before RESOLVED', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'resolved-first', state: 'RESOLVED', latestActivityTs: '2026-07-19T12:00:00Z' }),
      makeTopic({ id: 't2', name: 'active', state: 'ACTIVE', latestActivityTs: '2026-07-18T12:00:00Z' }),
    ]);
    const pills = Array.from(el.shadowRoot!.querySelectorAll('.topic-pill')) as Element[];
    const names = pills.map(p => p.textContent?.trim());
    // All first, then active, then resolved
    expect(names[1]).toContain('active');
    expect(names[2]).toContain('resolved-first');
  });

  it('hides ARCHIVED topics by default', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'General' }),
      makeTopic({ id: 't2', name: 'archived-one', state: 'ARCHIVED' }),
    ]);
    const pills = el.shadowRoot!.querySelectorAll('.topic-pill');
    expect(pills.length).toBe(2); // All + General only
  });

  it('shows archived toggle when ARCHIVED topics exist', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'General' }),
      makeTopic({ id: 't2', name: 'old', state: 'ARCHIVED' }),
    ]);
    const toggle = el.shadowRoot!.querySelector('.show-archived-toggle');
    expect(toggle).not.toBeNull();
  });

  it('hides archived toggle when no ARCHIVED topics', async () => {
    const el = await createElement([makeTopic()]);
    const toggle = el.shadowRoot!.querySelector('.show-archived-toggle');
    expect(toggle).toBeNull();
  });

  it('shows ARCHIVED topics when toggle is clicked', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'General' }),
      makeTopic({ id: 't2', name: 'old', state: 'ARCHIVED' }),
    ]);
    expect(el.shadowRoot!.querySelectorAll('.topic-pill').length).toBe(2);
    const toggle = el.shadowRoot!.querySelector('.show-archived-toggle')!;
    toggle.dispatchEvent(new Event('click', { bubbles: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.topic-pill').length).toBe(3);
  });

  it('emits channel:select-topic on topic pill click', async () => {
    const el = await createElement([makeTopic({ id: 't1', name: 'General', channelId: 'ch-1' })]);
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const topicPill = el.shadowRoot!.querySelectorAll('.topic-pill')[1]; // skip "All"
    topicPill?.dispatchEvent(new Event('click', { bubbles: true }));
    await el.updateComplete;
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.detail.topic).toBe('channel:select-topic');
    expect(event.detail.payload.topicId).toBe('t1');
  });

  it('emits channel:select-topic with null on "All" pill click', async () => {
    const el = await createElement([makeTopic()], 'topic-1');
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const allPill = el.shadowRoot!.querySelectorAll('.topic-pill')[0];
    allPill?.dispatchEvent(new Event('click', { bubbles: true }));
    await el.updateComplete;
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.detail.payload.topicId).toBeNull();
  });

  it('marks selected pill with active class', async () => {
    const el = await createElement([makeTopic({ id: 't1' })], 't1');
    const pills = el.shadowRoot!.querySelectorAll('.topic-pill');
    expect(pills[1]?.classList.contains('active')).toBe(true);
    expect(pills[0]?.classList.contains('active')).toBe(false); // "All" not active
  });

  it('marks "All" pill active when selectedTopicId is null', async () => {
    const el = await createElement([makeTopic()], null);
    const allPill = el.shadowRoot!.querySelectorAll('.topic-pill')[0];
    expect(allPill?.classList.contains('active')).toBe(true);
  });

  it('emits channel:view-mode on Topics toggle click', async () => {
    const el = await createElement([makeTopic()]);
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const topicsBtn = el.shadowRoot!.querySelector('.mode-btn');
    topicsBtn?.dispatchEvent(new Event('click', { bubbles: true }));
    await el.updateComplete;
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0]![0]! as CustomEvent;
    expect(event.detail.topic).toBe('channel:view-mode');
    expect(event.detail.payload.mode).toBe('topics');
  });

  it('highlights Topics button when active', async () => {
    const el = await createElement([makeTopic()], null, 'topics');
    const topicsBtn = el.shadowRoot!.querySelector('.mode-btn');
    expect(topicsBtn?.classList.contains('active')).toBe(true);
  });

  it('dims RESOLVED topic pills', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'resolved', state: 'RESOLVED' }),
    ]);
    const pills = el.shadowRoot!.querySelectorAll('.topic-pill');
    expect(pills[1]?.classList.contains('resolved')).toBe(true);
  });

  it('shows message count badge on topic pills', async () => {
    const el = await createElement([
      makeTopic({ id: 't1', name: 'busy', messageCount: 42 }),
    ]);
    const badge = el.shadowRoot!.querySelector('.topic-pill .count');
    expect(badge?.textContent).toContain('42');
  });
});
