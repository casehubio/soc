import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkIdentity } from '@casehubio/mosaic-core';
import type { OutcomeDefinition, QuorumConfig } from './approval-gate.js';
import './approval-gate.js';

type ApprovalGateEl = HTMLElement & {
  gateId: string;
  endpoint: string;
  identity: WorkIdentity;
  prompt: string;
  contextText: string;
  outcomes: OutcomeDefinition[];
  quorum: QuorumConfig | null;
  deadline: string | null;
  slaWindow: number | null;
  history: Array<{ timestamp: string; actor: string; outcome: string }>;
  data: Record<string, unknown> | null;
  requireConfirmation: boolean;
  updateComplete: Promise<boolean>;
  configure: (props: Record<string, unknown>) => void;
};

const identity: WorkIdentity = { userId: 'user-1', displayName: 'Alice', groups: ['approvers'] };

describe('agency-approval-gate', () => {
  let el: ApprovalGateEl;

  beforeEach(async () => {
    vi.useFakeTimers();
    el = document.createElement('agency-approval-gate') as ApprovalGateEl;
    el.gateId = 'gate-001';
    el.endpoint = '/api/work-items';
    el.identity = identity;
    el.prompt = 'Approve PI authorisation for Trial X?';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the prompt text', () => {
    expect(el.shadowRoot!.textContent).toContain('Approve PI authorisation');
  });

  it('renders default approve/reject buttons', () => {
    const buttons = el.shadowRoot!.querySelectorAll('.action-btn');
    expect(buttons.length).toBe(2);
    const labels = Array.from(buttons).map(b => b.textContent!.trim());
    expect(labels).toContain('Approve');
    expect(labels).toContain('Reject');
  });

  it('renders custom outcomes', async () => {
    el.outcomes = [
      { key: 'file-sar', label: 'File SAR', variant: 'danger' },
      { key: 'close', label: 'Close', variant: 'neutral' },
    ];
    await el.updateComplete;
    const buttons = el.shadowRoot!.querySelectorAll('.action-btn');
    const labels = Array.from(buttons).map(b => b.textContent!.trim());
    expect(labels).toContain('File SAR');
    expect(labels).toContain('Close');
  });

  it('renders context text', async () => {
    el.contextText = 'This trial has 200 enrolled patients.';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('200 enrolled patients');
  });

  it('renders inline key-value evidence when data is set', async () => {
    el.data = { risk: 'HIGH', category: 'compliance' };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('risk');
    expect(el.shadowRoot!.textContent).toContain('HIGH');
  });

  it('renders sla-indicator when deadline is set', async () => {
    el.deadline = new Date(Date.now() + 86400000).toISOString();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('agency-sla-indicator')).toBeTruthy();
  });

  it('renders quorum progress bar', async () => {
    el.quorum = {
      required: 3,
      total: 5,
      voters: [
        { id: 'user-2', name: 'Bob', status: 'voted', outcome: 'approve' },
        { id: 'user-3', name: 'Charlie', status: 'pending' },
        { id: 'user-1', name: 'Alice', status: 'pending' },
        { id: 'user-4', name: 'Diana', status: 'voted', outcome: 'approve' },
        { id: 'user-5', name: 'Eve', status: 'pending' },
      ],
    };
    await el.updateComplete;
    const progressbar = el.shadowRoot!.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect(progressbar!.getAttribute('aria-valuenow')).toBe('2');
    expect(progressbar!.getAttribute('aria-valuemax')).toBe('3');
  });

  it('quorum progressbar has aria-valuemin', async () => {
    el.quorum = {
      required: 3,
      total: 5,
      voters: [
        { id: 'user-2', name: 'Bob', status: 'voted', outcome: 'approve' },
        { id: 'user-3', name: 'Charlie', status: 'pending' },
        { id: 'user-1', name: 'Alice', status: 'pending' },
      ],
    };
    await el.updateComplete;
    const progressbar = el.shadowRoot!.querySelector('[role="progressbar"]');
    expect(progressbar!.getAttribute('aria-valuemin')).toBe('0');
  });

  it('shows already-decided state when current user has voted', async () => {
    el.quorum = {
      required: 2,
      total: 3,
      voters: [
        { id: 'user-1', name: 'Alice', status: 'voted', outcome: 'approve' },
        { id: 'user-2', name: 'Bob', status: 'pending' },
        { id: 'user-3', name: 'Charlie', status: 'pending' },
      ],
    };
    await el.updateComplete;
    const buttons = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action-btn'));
    for (const btn of buttons) {
      expect(btn.disabled).toBe(true);
    }
    expect(el.shadowRoot!.textContent).toContain('You voted');
  });

  it('opens confirmation dialog on outcome button click', async () => {
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog');
    expect(dialog).toBeTruthy();
    expect((dialog as any).open).toBe(true);
  });

  it('skips confirmation when requireConfirmation is false', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    const handler = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    document.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    const event = handler.mock.calls.find((c: any) => c[0].detail.topic === 'gate.decided');
    expect(event).toBeTruthy();
    document.removeEventListener('pages-event', handler);
  });

  it('includes serverData in gate.decided event on success', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    const serverResponse = { trustScore: { before: 72, after: 85 }, status: 'completed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(serverResponse) }));
    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    const event = handler.mock.calls.find((c: any) => c[0].detail.topic === 'gate.decided');
    expect(event).toBeTruthy();
    expect(event![0].detail.payload.serverData).toEqual(serverResponse);
    document.removeEventListener('pages-event', handler);
  });

  it('sets serverData to null when response body cannot be parsed', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) }));
    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    const event = handler.mock.calls.find((c: any) => c[0].detail.topic === 'gate.decided');
    expect(event).toBeTruthy();
    expect(event![0].detail.payload.serverData).toBeNull();
    document.removeEventListener('pages-event', handler);
  });

  it('renders history when provided', async () => {
    el.history = [{ timestamp: '2026-07-05T10:00:00Z', actor: 'Bob', outcome: 'approve' }];
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Bob');
  });

  it('configure() sets properties', async () => {
    el.configure({ prompt: 'New prompt?', requireConfirmation: false });
    await el.updateComplete;
    expect(el.prompt).toBe('New prompt?');
    expect(el.requireConfirmation).toBe(false);
  });

  it('has aria-describedby on action buttons pointing to prompt', () => {
    const btn = el.shadowRoot!.querySelector('.action-btn');
    const describedBy = btn!.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(el.shadowRoot!.getElementById(describedBy!)).toBeTruthy();
  });

  it('shows "Request more information" link when not decided', () => {
    const link = el.shadowRoot!.querySelector('.info-request-link');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain('Request more information');
  });

  it('hides "Request more information" link when already decided', async () => {
    el.history = [{ timestamp: '2026-07-05T10:00:00Z', actor: 'user-1', outcome: 'approve' }];
    await el.updateComplete;
    const link = el.shadowRoot!.querySelector('.info-request-link');
    expect(link).toBeFalsy();
  });

  it('toggles note input when "Request more information" is clicked', async () => {
    const link = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-link')!;
    expect(el.shadowRoot!.querySelector('.info-request-form')).toBeFalsy();
    link.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.info-request-form')).toBeTruthy();
    const textarea = el.shadowRoot!.querySelector('.info-request-textarea');
    expect(textarea).toBeTruthy();
  });

  it('emits gate.info-requested event when note is submitted', async () => {
    const handler = vi.fn();
    document.addEventListener('pages-event', handler);
    const link = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-link')!;
    link.click();
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.info-request-textarea')!;
    textarea.value = 'Need more context on patient risk';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    const submitBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-submit')!;
    submitBtn.click();
    await el.updateComplete;
    const event = handler.mock.calls.find((c: any) => c[0].detail.topic === 'gate.info-requested');
    expect(event).toBeTruthy();
    expect(event![0].detail.payload.gateId).toBe('gate-001');
    expect(event![0].detail.payload.note).toBe('Need more context on patient risk');
    document.removeEventListener('pages-event', handler);
  });

  it('hides note input after submission', async () => {
    const link = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-link')!;
    link.click();
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.info-request-textarea')!;
    textarea.value = 'Need clarification';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    const submitBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-submit')!;
    submitBtn.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.info-request-form')).toBeFalsy();
  });

  it('hides note input when cancel is clicked', async () => {
    const link = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-link')!;
    link.click();
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.info-request-textarea')!;
    textarea.value = 'Some note';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    const cancelBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.info-request-cancel')!;
    cancelBtn.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.info-request-form')).toBeFalsy();
  });

  it('renders error and re-enables buttons on HTTP error', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error).toBeTruthy();
    expect(error!.textContent).toContain('HTTP 500');

    const buttons = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action-btn'));
    for (const btn of buttons) {
      expect(btn.disabled).toBe(false);
    }

    const liveRegion = document.body.querySelector('[aria-live]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion!.textContent).toBe('Decision failed: HTTP 500');
    expect(liveRegion!.getAttribute('aria-live')).toBe('assertive');

    // Verify error clears on successful retry
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.error')).toBeFalsy();
  });

  it('renders error on network failure', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error).toBeTruthy();
    expect(error!.textContent).toContain('Network error');

    const buttons = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action-btn'));
    for (const btn of buttons) {
      expect(btn.disabled).toBe(false);
    }

    const liveRegion = document.body.querySelector('[aria-live]');
    expect(liveRegion!.textContent).toBe('Decision failed: Network error');
    expect(liveRegion!.getAttribute('aria-live')).toBe('assertive');
  });

  it('shows server error message from response body error field', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'Gate already completed by another voter' }),
    }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error!.textContent).toContain('Gate already completed by another voter');
  });

  it('shows server error message from response body message field', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Outcome not allowed for this gate type' }),
    }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error!.textContent).toContain('Outcome not allowed for this gate type');
  });

  it('falls back to HTTP status when error body is not parseable', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error!.textContent).toContain('HTTP 500');
  });

  it('falls back to HTTP status when error body is a JSON array', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve(['validation error 1', 'validation error 2']),
    }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error!.textContent).toContain('HTTP 400');
  });

  it('falls back to HTTP status when error field is empty string', async () => {
    el.requireConfirmation = false;
    await el.updateComplete;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: '' }),
    }));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    await el.updateComplete;
    await vi.runAllTimersAsync();
    await el.updateComplete;

    const error = el.shadowRoot!.querySelector('.error');
    expect(error!.textContent).toContain('HTTP 403');
  });
});
