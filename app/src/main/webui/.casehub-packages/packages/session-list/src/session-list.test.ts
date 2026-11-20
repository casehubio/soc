import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionResponse } from './types.js';
import './session-list.js';

type SessionListEl = HTMLElement & {
  endpoint: string;
  updateComplete: Promise<boolean>;
  _sessions: SessionResponse[];
  _handleDelete: (id: string) => Promise<void>;
  _handleRestart: (id: string) => Promise<void>;
};

const MOCK_SESSIONS: SessionResponse[] = [
  {
    id: 'sess-1', name: 'cl-worker-1', workingDir: '/home/dev/project',
    command: 'claude', status: 'ACTIVE', createdAt: '2026-07-27T10:00:00Z',
    lastActive: '2026-07-27T10:05:00Z', wsUrl: 'ws://localhost:3100/sess-1',
    browserUrl: 'http://localhost:3100/sess-1',
  },
  {
    id: 'sess-2', name: 'cl-worker-2', workingDir: '/home/dev/other',
    command: 'claude', status: 'IDLE', createdAt: '2026-07-27T09:00:00Z',
    lastActive: '2026-07-27T09:30:00Z', wsUrl: 'ws://localhost:3100/sess-2',
    browserUrl: 'http://localhost:3100/sess-2',
  },
];

describe('agency-session-list', () => {
  let el: SessionListEl;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SESSIONS),
    }));
    el = document.createElement('agency-session-list') as SessionListEl;
    el.endpoint = '/api/sessions';
    document.body.appendChild(el);
    await el.updateComplete;
    await vi.waitFor(() => {
      expect(el.shadowRoot!.querySelector('pages-table')).toBeTruthy();
    });
  });

  afterEach(() => {
    el.remove();
    vi.restoreAllMocks();
  });

  it('fetches sessions from endpoint on connect', () => {
    expect(fetch).toHaveBeenCalledWith('/api/sessions');
  });

  it('loads sessions into internal state', () => {
    expect(el._sessions).toHaveLength(2);
    expect(el._sessions[0]!.name).toBe('cl-worker-1');
    expect(el._sessions[1]!.name).toBe('cl-worker-2');
  });

  it('builds table dataset from sessions', () => {
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement & { dataSet: unknown };
    expect(table).toBeTruthy();
    expect(table.dataSet).toBeTruthy();
  });

  it('emits session:selected on row activate', async () => {
    const events: unknown[] = [];
    document.addEventListener('pages-event', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.topic === 'session:selected') events.push(detail.payload);
    });
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement;
    table.dispatchEvent(new CustomEvent('row-activate', { detail: { key: 'sess-1' }, bubbles: true, composed: true }));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ id: 'sess-1' });
  });

  it('sets selection="single" on pages-table', () => {
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement & { selection: string };
    expect(table.selection).toBe('single');
  });

  it('passes selectedKeys to pages-table after row activate', async () => {
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement & { selectedKeys?: readonly string[] };
    table.dispatchEvent(new CustomEvent('row-activate', { detail: { key: 'sess-1' }, bubbles: true, composed: true }));
    await el.updateComplete;
    expect(table.selectedKeys).toEqual(['sess-1']);
  });

  it('updates selectedKeys when a different row is activated', async () => {
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement & { selectedKeys?: readonly string[] };
    table.dispatchEvent(new CustomEvent('row-activate', { detail: { key: 'sess-1' }, bubbles: true, composed: true }));
    await el.updateComplete;
    table.dispatchEvent(new CustomEvent('row-activate', { detail: { key: 'sess-2' }, bubbles: true, composed: true }));
    await el.updateComplete;
    expect(table.selectedKeys).toEqual(['sess-2']);
  });

  it('clears selectedKeys on deselect event', async () => {
    const table = el.shadowRoot!.querySelector('pages-table') as HTMLElement & { selectedKeys?: readonly string[] };
    table.dispatchEvent(new CustomEvent('row-activate', { detail: { key: 'sess-1' }, bubbles: true, composed: true }));
    await el.updateComplete;
    expect(table.selectedKeys).toEqual(['sess-1']);
    document.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true, composed: true,
      detail: { topic: 'session:deselected', payload: {} },
    }));
    await el.updateComplete;
    expect(table.selectedKeys).toEqual([]);
  });

  it('creates a session via POST and prepends to list', async () => {
    const newSession: SessionResponse = {
      id: 'sess-3', name: 'cl-new', workingDir: '/tmp', command: 'claude',
      status: 'IDLE', createdAt: '2026-07-27T11:00:00Z', lastActive: '2026-07-27T11:00:00Z',
      wsUrl: 'ws://localhost:3100/sess-3', browserUrl: 'http://localhost:3100/sess-3',
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve(newSession),
    } as Response);

    const addBtn = el.shadowRoot!.querySelector('[aria-label="New session"]') as HTMLButtonElement;
    addBtn.click();
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll('input');
    const nameInput = inputs[0] as HTMLInputElement;
    nameInput.value = 'cl-new';
    nameInput.dispatchEvent(new Event('input'));
    const createBtn = el.shadowRoot!.querySelector('.spawn-form button') as HTMLButtonElement;
    createBtn.click();
    await el.updateComplete;
    await vi.waitFor(() => {
      expect(el._sessions).toHaveLength(3);
      expect(el._sessions[0]!.name).toBe('cl-new');
    });
  });

  it('deletes a session via DELETE and removes from list', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    await el._handleDelete('sess-1');
    await el.updateComplete;
    expect(el._sessions).toHaveLength(1);
    expect(el._sessions[0]!.id).toBe('sess-2');
  });

  it('restarts a session — delete then create', async () => {
    const restarted: SessionResponse = {
      id: 'sess-new', name: 'cl-worker-1', workingDir: '/home/dev/project',
      command: 'claude', status: 'IDLE', createdAt: '2026-07-27T12:00:00Z',
      lastActive: '2026-07-27T12:00:00Z', wsUrl: 'ws://localhost:3100/sess-new',
      browserUrl: 'http://localhost:3100/sess-new',
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(restarted) } as Response);
    await el._handleRestart('sess-1');
    await el.updateComplete;
    expect(el._sessions).toHaveLength(2);
    expect(el._sessions[0]!.name).toBe('cl-worker-1');
    expect(el._sessions[0]!.id).toBe('sess-new');
  });

  it('shows restart error banner when create fails after delete', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' } as Response);
    await el._handleRestart('sess-1');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.restart-error')).toBeTruthy();
    expect(el.shadowRoot!.textContent).toContain('Restart failed');
  });
});
