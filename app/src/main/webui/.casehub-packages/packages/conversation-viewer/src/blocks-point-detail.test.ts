import { describe, it, expect, beforeEach } from 'vitest';
import type { ConversationPoint, SubTaskFinding, FlagEntry, ObligationChain } from './types.js';
import './blocks-point-detail.js';

type DetailElement = HTMLElement & {
  point?: ConversationPoint;
  findings: SubTaskFinding[];
  flags: FlagEntry[];
  obligations: ObligationChain[];
  updateComplete: Promise<boolean>;
};

const MOCK_POINT: ConversationPoint = {
  id: 'p1', topic: 'Auth scoping', round: 1,
  classification: { priority: 'HIGH', scope: 'ARCHITECTURE', location: 'auth.ts' },
  entries: [
    { entryType: 'RAISE', content: 'The auth module needs scoping to tenant boundaries', agentRole: 'REV', round: 1, timestamp: '2026-08-01T10:00:00Z' },
    { entryType: 'COUNTER', content: 'Current approach handles multi-tenant via middleware', agentRole: 'IMP', round: 1, timestamp: '2026-08-01T10:05:00Z' },
    { entryType: 'QUALIFY', content: 'Fair point, but edge case with shared resources', agentRole: 'REV', round: 2, timestamp: '2026-08-01T11:00:00Z' },
  ],
  status: 'ACTIVE',
};

const MOCK_FINDINGS: SubTaskFinding[] = [
  { id: 'st1', pointId: 'p1', taskType: 'VERIFY', content: 'Reproduced the edge case in staging', status: 'CONFIRMED', round: 2 },
];

const MOCK_FLAGS: FlagEntry[] = [
  { id: 'fl1', pointId: 'p1', content: 'Needs product owner sign-off', flaggedBy: 'HUMAN', round: 3 },
];

const MOCK_OBLIGATIONS: ObligationChain[] = [
  {
    pointId: 'p1', correlationId: 'corr-1',
    commitment: { state: 'OPEN', createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z' },
    transitions: [{ from: 'OPEN', to: 'ACKNOWLEDGED', actor: 'IMP', timestamp: '2026-08-01T10:05:00Z' }],
  },
];

function createElement(): DetailElement {
  const el = document.createElement('blocks-point-detail') as DetailElement;
  document.body.appendChild(el);
  return el;
}

describe('blocks-point-detail', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders nothing without point', async () => {
    const el = createElement();
    await el.updateComplete;
    const header = el.shadowRoot?.querySelector('.detail-header');
    expect(header).toBeNull();
  });

  it('renders header with topic', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    await el.updateComplete;
    const topic = el.shadowRoot?.querySelector('.detail-topic');
    expect(topic?.textContent).toContain('Auth scoping');
  });

  it('renders status badge', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    await el.updateComplete;
    const badge = el.shadowRoot?.querySelector('pages-status-badge');
    expect(badge).toBeTruthy();
    expect(badge?.getAttribute('state')).toBe('ACTIVE');
  });

  it('renders classification badges', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    await el.updateComplete;
    const badges = el.shadowRoot?.querySelectorAll('.detail-header .badge');
    const texts = Array.from(badges ?? []).map(b => b.textContent?.trim());
    expect(texts).toContain('HIGH');
    expect(texts).toContain('ARCHITECTURE');
    expect(texts).toContain('auth.ts');
  });

  it('renders entry thread cards', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    await el.updateComplete;
    const entries = el.shadowRoot?.querySelectorAll('.entry-card');
    expect(entries?.length).toBe(3);
  });

  it('shows agent role and entry type on entries', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    await el.updateComplete;
    const firstEntry = el.shadowRoot?.querySelector('.entry-card');
    expect(firstEntry?.textContent).toContain('REV');
    expect(firstEntry?.textContent).toContain('RAISE');
  });

  it('shows entry content', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    await el.updateComplete;
    const firstEntry = el.shadowRoot?.querySelector('.entry-card .entry-content');
    expect(firstEntry?.textContent).toContain('auth module needs scoping');
  });

  it('shows sub-task findings section when present', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    el.findings = MOCK_FINDINGS;
    await el.updateComplete;
    const section = el.shadowRoot?.querySelector('.findings-section');
    expect(section).toBeTruthy();
    expect(section?.textContent).toContain('VERIFY');
    expect(section?.textContent).toContain('Reproduced the edge case');
  });

  it('hides findings section when empty', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    el.findings = [];
    await el.updateComplete;
    const section = el.shadowRoot?.querySelector('.findings-section');
    expect(section).toBeNull();
  });

  it('shows flags with warning styling', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    el.flags = MOCK_FLAGS;
    await el.updateComplete;
    const section = el.shadowRoot?.querySelector('.flags-section');
    expect(section).toBeTruthy();
    expect(section?.textContent).toContain('Needs product owner sign-off');
    expect(section?.textContent).toContain('HUMAN');
  });

  it('hides flags section when empty', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    el.flags = [];
    await el.updateComplete;
    const section = el.shadowRoot?.querySelector('.flags-section');
    expect(section).toBeNull();
  });

  it('shows obligations section when present', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    el.obligations = MOCK_OBLIGATIONS;
    await el.updateComplete;
    const section = el.shadowRoot?.querySelector('.obligations-section');
    expect(section).toBeTruthy();
  });

  it('hides obligations section when empty', async () => {
    const el = createElement();
    el.point = MOCK_POINT;
    el.obligations = [];
    await el.updateComplete;
    const section = el.shadowRoot?.querySelector('.obligations-section');
    expect(section).toBeNull();
  });
});
