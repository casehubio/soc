import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CommonGroundState, GroundedFact } from './types.js';
import './blocks-common-ground-panel.js';

type PanelElement = HTMLElement & {
  commonGround?: CommonGroundState;
  factTopic?: string;
  updateComplete: Promise<boolean>;
};

const MOCK_FACTS: GroundedFact[] = [
  { id: 'f1', topic: 'Auth scoping', content: 'JWT tokens must be scoped to tenant', epistemicStatus: 'ESTABLISHED', acknowledgedBy: ['REV', 'IMP'], disputedBy: [], round: 1 },
  { id: 'f2', topic: 'Rate limits', content: 'Needs per-endpoint limits', epistemicStatus: 'PENDING', acknowledgedBy: ['REV'], disputedBy: [], round: 2 },
  { id: 'f3', topic: 'Cache TTL', content: '60s is too long for auth tokens', epistemicStatus: 'DISPUTED', acknowledgedBy: ['REV'], disputedBy: ['IMP'], round: 3 },
  { id: 'f4', topic: 'Error model', content: 'Use RFC 7807 Problem Details', epistemicStatus: 'ESTABLISHED', acknowledgedBy: ['REV', 'IMP', 'SUP'], disputedBy: [], round: 1 },
];

const MOCK_COMMON_GROUND: CommonGroundState = { facts: MOCK_FACTS };

function createElement(): PanelElement {
  const el = document.createElement('blocks-common-ground-panel') as PanelElement;
  document.body.appendChild(el);
  return el;
}

describe('blocks-common-ground-panel', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders three columns', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    await el.updateComplete;
    const columns = el.shadowRoot?.querySelectorAll('.column');
    expect(columns?.length).toBe(3);
  });

  it('partitions facts by epistemicStatus', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    await el.updateComplete;
    const badges = el.shadowRoot?.querySelectorAll('.count-badge span');
    expect(badges?.[0]?.textContent).toBe('2');
    expect(badges?.[1]?.textContent).toBe('1');
    expect(badges?.[2]?.textContent).toBe('1');
  });

  it('shows empty placeholder for columns with no facts', async () => {
    const el = createElement();
    el.commonGround = { facts: [MOCK_FACTS[0]!] };
    await el.updateComplete;
    const placeholders = el.shadowRoot?.querySelectorAll('.empty-placeholder');
    expect(placeholders?.length).toBe(2);
  });

  it('renders fact topic and content', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    await el.updateComplete;
    const topics = el.shadowRoot?.querySelectorAll('.fact-topic');
    expect(topics?.[0]?.textContent).toBe('Auth scoping');
  });

  it('shows round and acknowledgement count', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    await el.updateComplete;
    const footers = el.shadowRoot?.querySelectorAll('.fact-footer');
    expect(footers?.[0]?.textContent).toContain('R1');
    expect(footers?.[0]?.textContent).toContain('2 ack');
  });

  it('shows dispute count when present', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    await el.updateComplete;
    const allFooters = el.shadowRoot?.querySelectorAll('.fact-footer');
    const disputedFooter = Array.from(allFooters ?? []).find(f => f.textContent?.includes('disputed'));
    expect(disputedFooter).toBeTruthy();
    expect(disputedFooter?.textContent).toContain('1 disputed');
  });

  it('emits fact-selected pages-event on click', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    await el.updateComplete;
    const listener = vi.fn();
    document.addEventListener('pages-event', listener);
    const card = el.shadowRoot?.querySelector('.fact-card') as HTMLElement;
    card?.click();
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('common-ground-fact:selected');
    expect(detail.payload.factId).toBe('f1');
    expect(detail.payload.epistemicStatus).toBe('ESTABLISHED');
    document.removeEventListener('pages-event', listener);
  });

  it('uses custom factTopic for events', async () => {
    const el = createElement();
    el.commonGround = MOCK_COMMON_GROUND;
    el.factTopic = 'my-facts';
    await el.updateComplete;
    const listener = vi.fn();
    document.addEventListener('pages-event', listener);
    const card = el.shadowRoot?.querySelector('.fact-card') as HTMLElement;
    card?.click();
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('my-facts:selected');
    document.removeEventListener('pages-event', listener);
  });

  it('renders nothing when commonGround is undefined', async () => {
    const el = createElement();
    await el.updateComplete;
    const columns = el.shadowRoot?.querySelectorAll('.column');
    expect(columns?.length).toBe(3);
    const placeholders = el.shadowRoot?.querySelectorAll('.empty-placeholder');
    expect(placeholders?.length).toBe(3);
  });
});
