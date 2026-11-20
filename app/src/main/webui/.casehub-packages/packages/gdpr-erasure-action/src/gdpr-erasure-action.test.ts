import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './gdpr-erasure-action.js';

type GdprErasureActionEl = HTMLElement & {
  endpoint: string;
  subjectLabel: string;
  reasonOptions: string[];
  updateComplete: Promise<boolean>;
};

let originalFetch: typeof globalThis.fetch;

function fillAndSubmit(el: GdprErasureActionEl, subjectId: string, reason: string) {
  const schemaForm = el.shadowRoot!.querySelector('pages-schema-form')!;
  schemaForm.dispatchEvent(new CustomEvent('pages-form-change', {
    bubbles: true, composed: true,
    detail: { key: 'subjectId', value: subjectId, data: { subjectId, reason } },
  }));
  schemaForm.dispatchEvent(new CustomEvent('pages-form-change', {
    bubbles: true, composed: true,
    detail: { key: 'reason', value: reason, data: { subjectId, reason } },
  }));
  (schemaForm as any).submit = () => ({ subjectId, reason });
  const form = el.shadowRoot!.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { cancelable: true }));
}

describe('agency-gdpr-erasure-action', () => {
  let el: GdprErasureActionEl;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    el = document.createElement('agency-gdpr-erasure-action') as GdprErasureActionEl;
    el.endpoint = 'http://test.local/api/erasure';
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    globalThis.fetch = originalFetch;
  });

  it('renders form with schema-form component', async () => {
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('form');
    expect(form).toBeTruthy();
    const schemaForm = el.shadowRoot!.querySelector('pages-schema-form');
    expect(schemaForm).toBeTruthy();
  });

  it('renders custom subjectLabel in warning and schema', async () => {
    el.subjectLabel = 'Patient';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('patient');
    const schemaForm = el.shadowRoot!.querySelector('pages-schema-form') as any;
    expect(schemaForm.schema.properties.subjectId.title).toBe('Patient ID');
  });

  it('renders custom reasonOptions in schema', async () => {
    el.reasonOptions = ['Custom Reason 1', 'Custom Reason 2'];
    await el.updateComplete;
    const schemaForm = el.shadowRoot!.querySelector('pages-schema-form') as any;
    const reasonOneOf = schemaForm.schema.properties.reason.oneOf;
    expect(reasonOneOf).toHaveLength(2);
    expect(reasonOneOf[0].title).toBe('Custom Reason 1');
    expect(reasonOneOf[1].title).toBe('Custom Reason 2');
  });

  it('shows validation error when submitting empty fields', async () => {
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.textContent!.toLowerCase()).toContain('required');
  });

  it('opens confirm dialog on valid submit', async () => {
    await el.updateComplete;
    fillAndSubmit(el, 'subject-123', el.reasonOptions[0]!);
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement & { open: boolean };
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBe(true);
  });

  it('performs POST on confirm and renders receipt', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        erasureId: 'erase-001',
        status: 'WITHDRAWN',
        timestamp: '2026-07-14T12:00:00Z',
        entryCount: 42,
      }), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await el.updateComplete;
    fillAndSubmit(el, 'subject-123', el.reasonOptions[0]!);
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm'));
    await el.updateComplete;

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await el.updateComplete;

    expect(mockFetch).toHaveBeenCalledWith('http://test.local/api/erasure', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('subject-123'),
    }));

    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('Erasure Complete'));
    expect(el.shadowRoot!.textContent).toContain('erase-001');
    expect(el.shadowRoot!.textContent).toContain('42');
  });

  it('emits gdpr.erasure-completed event on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: 'WITHDRAWN',
        timestamp: '2026-07-14T12:00:00Z',
      }), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const handler = vi.fn();
    document.addEventListener('pages-event', handler);

    await el.updateComplete;
    fillAndSubmit(el, 'subject-456', el.reasonOptions[0]!);
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm'));

    await vi.waitFor(() => {
      const event = handler.mock.calls.find(
        (c: unknown[]) => (c[0] as CustomEvent).detail.topic === 'gdpr.erasure-completed'
      );
      expect(event).toBeTruthy();
    });

    document.removeEventListener('pages-event', handler);
  });

  it('renders error state on POST failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await el.updateComplete;
    fillAndSubmit(el, 'subject-fail', el.reasonOptions[0]!);
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm'));

    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('HTTP 500'));
  });

  it('cancels confirmation and returns to form', async () => {
    await el.updateComplete;
    fillAndSubmit(el, 'subject-123', el.reasonOptions[0]!);
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('cancel'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('form')).toBeTruthy();
    expect((el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement & { open: boolean }).open).toBe(false);
  });

  it('resets form after receipt', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'WITHDRAWN', timestamp: '2026-07-14T12:00:00Z' }), { status: 200 })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await el.updateComplete;
    fillAndSubmit(el, 'subject-reset', el.reasonOptions[0]!);
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('pages-confirm-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm'));

    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('Erasure Complete'));

    const resetBtn = el.shadowRoot!.querySelector('.btn-secondary') as HTMLButtonElement;
    expect(resetBtn).toBeTruthy();
    resetBtn.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('form')).toBeTruthy();
  });

  it('does not have DataSourceMixin properties', async () => {
    await el.updateComplete;
    expect('dataSet' in el).toBe(false);
    expect('dataSource' in el).toBe(false);
    expect('loading' in el).toBe(false);
  });
});
