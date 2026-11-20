import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './session-detail.js';

type SessionDetailEl = HTMLElement & {
  endpoint: string;
  sessionId: string | undefined;
  updateComplete: Promise<boolean>;
  _activeTab: string;
  _terminalOutput: string;
  _events: Array<{ timestamp: string; type: string; data: string }>;
};

describe('agency-session-detail', () => {
  let el: SessionDetailEl;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve('$ echo hello\nhello\n$'),
    }));
    el = document.createElement('agency-session-detail') as SessionDetailEl;
    el.endpoint = '/api/sessions';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
    vi.restoreAllMocks();
  });

  it('shows placeholder when no session selected', () => {
    expect(el.shadowRoot!.textContent).toContain('Select a session');
  });

  it('renders tabs when sessionId is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, text: () => Promise.resolve('$ echo hello\nhello'),
    } as unknown as Response);
    el.sessionId = 'sess-1';
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);
    const labels = Array.from(tabs).map(t => t.textContent!.trim());
    expect(labels).toEqual(['Terminal', 'Git', 'Health', 'Events']);
  });

  it('fetches terminal output when sessionId is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, text: () => Promise.resolve('$ whoami\ndev'),
    } as unknown as Response);
    el.sessionId = 'sess-1';
    await el.updateComplete;
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/sessions/sess-1/output?lines=200');
    });
  });

  it('clears sessionId on session:deselected event', async () => {
    el.sessionId = 'sess-1';
    await el.updateComplete;
    document.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true, composed: true,
      detail: { topic: 'session:deselected', payload: {} },
    }));
    await el.updateComplete;
    expect(el.sessionId).toBeUndefined();
    expect(el.shadowRoot!.textContent).toContain('Select a session');
  });

  it('sets sessionId on session:selected event', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, text: () => Promise.resolve('output'),
    } as unknown as Response);
    document.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true, composed: true,
      detail: { topic: 'session:selected', payload: { id: 'sess-42' } },
    }));
    await el.updateComplete;
    expect(el.sessionId).toBe('sess-42');
  });

  it('fetches new session data when sessionId changes', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, text: () => Promise.resolve('output for sess-1'),
    } as unknown as Response);
    el.sessionId = 'sess-1';
    await el.updateComplete;
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/sessions/sess-1/output?lines=200');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, text: () => Promise.resolve('output for sess-2'),
    } as unknown as Response);
    el.sessionId = 'sess-2';
    await el.updateComplete;
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/sessions/sess-2/output?lines=200');
    });
    await vi.waitFor(() => {
      expect(el._terminalOutput).toBe('output for sess-2');
    });
  });

  it('tears down timers on sessionId change', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue({
      ok: true, text: () => Promise.resolve('output'),
    } as unknown as Response);
    el.sessionId = 'sess-1';
    await el.updateComplete;

    el.sessionId = undefined;
    await el.updateComplete;

    const fetchCountBefore = vi.mocked(fetch).mock.calls.length;
    vi.advanceTimersByTime(5000);
    const fetchCountAfter = vi.mocked(fetch).mock.calls.length;
    expect(fetchCountAfter).toBe(fetchCountBefore);
    vi.useRealTimers();
  });
});
