import { describe, it, expect, afterEach } from 'vitest';
import './debate-feed.js';
import type { DebateStreamEntry } from './types.js';

function entry(round: number, overrides: Partial<DebateStreamEntry> = {}): DebateStreamEntry {
  return {
    entryType: 'RAISE', content: `Point from round ${round}`,
    round, agentRole: 'REV', timestamp: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

afterEach(() => { document.body.innerHTML = ''; });

describe('debate-feed', () => {
  it('renders placeholder when not configured', async () => {
    const el = document.createElement('debate-feed') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    const placeholder = el.shadowRoot!.querySelector('.placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder!.textContent).toContain('Waiting');
  });

  it('renders empty state when configured with no entries', async () => {
    const el = document.createElement('debate-feed') as any;
    el.configure({ debateSessionId: 'test-session' });
    document.body.appendChild(el);
    await el.updateComplete;

    const placeholder = el.shadowRoot!.querySelector('.placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder!.textContent).toContain('No entries');
  });

  it('renders entries grouped by round', async () => {
    const el = document.createElement('debate-feed') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [
      entry(1, { entryType: 'RAISE', content: 'First point' }),
      entry(1, { entryType: 'COUNTER', agentRole: 'IMP', content: 'Counter' }),
      entry(2, { entryType: 'RAISE', content: 'Second round' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const dividers = el.shadowRoot!.querySelectorAll('.round-divider');
    expect(dividers.length).toBe(2);
    expect(dividers[0].textContent).toContain('Round 1');
    expect(dividers[1].textContent).toContain('Round 2');
  });

  it('applies entry type class for styling', async () => {
    const el = document.createElement('debate-feed') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [entry(1, { entryType: 'DISPUTE' })];
    document.body.appendChild(el);
    await el.updateComplete;

    const entryEl = el.shadowRoot!.querySelector('.entry-dispute');
    expect(entryEl).toBeTruthy();
  });

  it('renders RESTART_CONTEXT as separator', async () => {
    const el = document.createElement('debate-feed') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [entry(1, { entryType: 'RESTART_CONTEXT', content: '' })];
    document.body.appendChild(el);
    await el.updateComplete;

    const restart = el.shadowRoot!.querySelector('.entry-restart_context');
    expect(restart).toBeTruthy();
    expect(restart!.textContent).toContain('session branched');
  });

  it('shows human badge for HUMAN agent role', async () => {
    const el = document.createElement('debate-feed') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [entry(1, { agentRole: 'HUMAN', entryType: 'COMMENT' })];
    document.body.appendChild(el);
    await el.updateComplete;

    const agent = el.shadowRoot!.querySelector('.entry-agent.human');
    expect(agent).toBeTruthy();
  });

  it('dispatches point-selected on entry click', async () => {
    const el = document.createElement('debate-feed') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [entry(1, { pointId: 'pt-1', location: '§3.2' })];
    document.body.appendChild(el);
    await el.updateComplete;

    let selectedDetail: any = null;
    el.addEventListener('point-selected', (e: CustomEvent) => { selectedDetail = e.detail; });

    const entryEl = el.shadowRoot!.querySelector('.entry-card');
    entryEl!.click();

    expect(selectedDetail).toBeTruthy();
    expect(selectedDetail.pointId).toBe('pt-1');
    expect(selectedDetail.location).toBe('§3.2');
  });
});
