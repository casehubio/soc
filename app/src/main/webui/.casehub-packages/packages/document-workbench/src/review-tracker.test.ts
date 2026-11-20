import { describe, it, expect, afterEach } from 'vitest';
import './review-tracker.js';
import type { DebateStreamEntry } from './types.js';

function entry(overrides: Partial<DebateStreamEntry> = {}): DebateStreamEntry {
  return {
    entryType: 'RAISE', content: 'Test review point', round: 1,
    agentRole: 'REV', pointId: 'pt-1',
    ...overrides,
  };
}

afterEach(() => { document.body.innerHTML = ''; });

describe('review-tracker', () => {
  it('renders placeholder when not configured', async () => {
    const el = document.createElement('review-tracker') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    const placeholder = el.shadowRoot!.querySelector('.placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder!.textContent).toContain('Waiting');
  });

  it('renders review points from entries', async () => {
    const el = document.createElement('review-tracker') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [
      entry({ pointId: 'pt-1', content: 'Missing error handling' }),
      entry({ pointId: 'pt-2', content: 'Race condition risk' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const points = el.shadowRoot!.querySelectorAll('.point-item');
    expect(points.length).toBe(2);
  });

  it('shows progress bar with resolved count', async () => {
    const el = document.createElement('review-tracker') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [
      entry({ pointId: 'pt-1', entryType: 'RAISE', content: 'Open point' }),
      entry({ pointId: 'pt-2', entryType: 'RAISE', content: 'To be agreed' }),
      entry({ pointId: 'pt-2', entryType: 'AGREE', content: 'Agreed', agentRole: 'IMP' }),
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const label = el.shadowRoot!.querySelector('.progress-label');
    expect(label!.textContent).toContain('1 of 2');
  });

  it('emits point-selected on click', async () => {
    const el = document.createElement('review-tracker') as any;
    el.configure({ debateSessionId: 'test-session' });
    el._entries = [entry({ pointId: 'pt-1', location: '§3.2' })];
    document.body.appendChild(el);
    await el.updateComplete;

    let detail: any = null;
    el.addEventListener('point-selected', (e: CustomEvent) => { detail = e.detail; });

    const point = el.shadowRoot!.querySelector('.point-item');
    point!.click();

    expect(detail).toBeTruthy();
    expect(detail.pointId).toBe('pt-1');
  });

  it('accepts apiBaseUrl property', async () => {
    const el = document.createElement('review-tracker') as any;
    el.apiBaseUrl = 'http://localhost:9001';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.apiBaseUrl).toBe('http://localhost:9001');
  });

  it('defaults apiBaseUrl to empty string', async () => {
    const el = document.createElement('review-tracker') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.apiBaseUrl).toBe('');
  });
});
