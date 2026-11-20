import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './session-workbench.js';

type SessionWorkbenchEl = HTMLElement & {
  endpoint: string;
  updateComplete: Promise<boolean>;
  configure: (props: { endpoint?: string }) => void;
};

describe('agency-session-workbench', () => {
  let el: SessionWorkbenchEl;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve([]),
    }));
    el = document.createElement('agency-session-workbench') as SessionWorkbenchEl;
    el.endpoint = '/api/sessions';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
    vi.restoreAllMocks();
  });

  it('renders split-workbench with session-list and session-detail', () => {
    const split = el.shadowRoot!.querySelector('pages-split-workbench');
    expect(split).toBeTruthy();
    expect(split!.getAttribute('selection-topic')).toBe('session');
    const list = el.shadowRoot!.querySelector('agency-session-list');
    const detail = el.shadowRoot!.querySelector('agency-session-detail');
    expect(list).toBeTruthy();
    expect(detail).toBeTruthy();
  });

  it('passes endpoint to children', async () => {
    await vi.waitFor(() => {
      const list = el.shadowRoot!.querySelector('agency-session-list') as HTMLElement & { endpoint: string };
      expect(list.endpoint).toBe('/api/sessions');
    });
    const detail = el.shadowRoot!.querySelector('agency-session-detail') as HTMLElement & { endpoint: string };
    expect(detail.endpoint).toBe('/api/sessions');
  });

  it('supports configure() for hostPanel integration', async () => {
    el.configure({ endpoint: '/api/other-sessions' });
    await el.updateComplete;
    const list = el.shadowRoot!.querySelector('agency-session-list') as HTMLElement & { endpoint: string };
    expect(list.endpoint).toBe('/api/other-sessions');
  });
});
