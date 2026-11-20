import { describe, it, expect, vi, beforeEach } from 'vitest';
import './entity-command-bar.js';
import type { CommandDescriptor } from './types.js';

describe('EntityCommandBar', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = vi.fn();
    document.body.innerHTML = '';
  });

  function createBar(commands: readonly CommandDescriptor[], entityId = 'e1', entityType = 'worker') {
    const el = document.createElement('agency-entity-command-bar') as any;
    el.commands = commands;
    el.entityId = entityId;
    el.entityType = entityType;
    el.fetchFn = fetchFn;
    document.body.appendChild(el);
    return el;
  }

  const normalCommand: CommandDescriptor = {
    name: 'restart',
    label: 'Restart',
    endpoint: '/api/workers/e1/restart',
  };

  const destructiveCommand: CommandDescriptor = {
    name: 'cancel',
    label: 'Cancel Worker',
    severity: 'destructive',
    confirmation: true,
    confirmMessage: 'This will terminate the worker.',
    endpoint: '/api/workers/e1/cancel',
  };

  const paramCommand: CommandDescriptor = {
    name: 'reassign',
    label: 'Reassign',
    endpoint: '/api/workers/e1/reassign',
    parameters: [
      { name: 'targetId', label: 'Target Worker', type: 'string', required: true },
    ],
  };

  it('renders a button for each command', async () => {
    const el = createBar([normalCommand, destructiveCommand]);
    await el.updateComplete;

    const buttons = el.shadowRoot!.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent!.trim()).toBe('Restart');
    expect(buttons[1].textContent!.trim()).toBe('Cancel Worker');
  });

  it('renders nothing when commands is empty', async () => {
    const el = createBar([]);
    await el.updateComplete;

    const buttons = el.shadowRoot!.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('destructive commands have danger styling', async () => {
    const el = createBar([destructiveCommand]);
    await el.updateComplete;

    const button = el.shadowRoot!.querySelector('button')!;
    expect(button.classList.contains('destructive')).toBe(true);
  });

  it('clicking a non-confirmation command POSTs to endpoint', async () => {
    fetchFn.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const el = createBar([normalCommand]);
    await el.updateComplete;

    const button = el.shadowRoot!.querySelector('button')!;
    button.click();
    await el.updateComplete;

    expect(fetchFn).toHaveBeenCalledWith('/api/workers/e1/restart', expect.objectContaining({ method: 'POST' }));
  });

  it('clicking a confirmation command opens confirm dialog first', async () => {
    const el = createBar([destructiveCommand]);
    await el.updateComplete;

    const button = el.shadowRoot!.querySelector('button')!;
    button.click();
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog');
    expect(dialog).toBeTruthy();
    expect((dialog as any).heading).toBe('Cancel Worker');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('emits entity-changed event on successful POST', async () => {
    fetchFn.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const el = createBar([normalCommand]);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    document.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail?.topic === 'entity.changed') events.push(e);
    }) as EventListener);

    const button = el.shadowRoot!.querySelector('button')!;
    button.click();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));

    expect(events.length).toBe(1);
    expect(events[0]!.detail.payload.entityId).toBe('e1');
    expect(events[0]!.detail.payload.entityType).toBe('worker');
  });

  it('shows error message on failed POST', async () => {
    fetchFn.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Worker not found' }),
    });
    const el = createBar([normalCommand]);
    await el.updateComplete;

    const button = el.shadowRoot!.querySelector('button')!;
    button.click();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 0));

    expect(el.shadowRoot!.textContent).toContain('Worker not found');
  });
});
