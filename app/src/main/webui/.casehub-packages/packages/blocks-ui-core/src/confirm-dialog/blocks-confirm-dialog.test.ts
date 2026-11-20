import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './blocks-confirm-dialog.js';

type ConfirmDialog = HTMLElement & {
  open: boolean;
  heading: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: 'success' | 'danger' | 'neutral';
  showReason: boolean;
  persistent: boolean;
  updateComplete: Promise<boolean>;
};

describe('blocks-confirm-dialog', () => {
  let el: ConfirmDialog;

  beforeEach(async () => {
    el = document.createElement('blocks-confirm-dialog') as ConfirmDialog;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('is hidden when open is false', () => {
    expect(el.shadowRoot!.querySelector('.overlay')).toBeNull();
  });

  it('renders overlay and dialog when open is true', async () => {
    el.open = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.overlay')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[role="alertdialog"]')).toBeTruthy();
  });

  it('renders heading and message', async () => {
    el.heading = 'Delete item?';
    el.message = 'This cannot be undone.';
    el.open = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Delete item?');
    expect(el.shadowRoot!.textContent).toContain('This cannot be undone.');
  });

  it('renders custom button labels', async () => {
    el.confirmLabel = 'Yes, delete';
    el.cancelLabel = 'Keep it';
    el.open = true;
    await el.updateComplete;
    const buttons = el.shadowRoot!.querySelectorAll('button');
    const labels = Array.from(buttons).map(b => b.textContent!.trim());
    expect(labels).toContain('Yes, delete');
    expect(labels).toContain('Keep it');
  });

  it('emits confirm event on confirm button click', async () => {
    el.open = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('confirm', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-confirm')!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emits cancel event on cancel button click', async () => {
    el.open = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('cancel', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-cancel')!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emits cancel on Escape key', async () => {
    el.open = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('cancel', handler);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emits cancel on overlay click when not persistent', async () => {
    el.open = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('cancel', handler);
    el.shadowRoot!.querySelector<HTMLElement>('.overlay')!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit cancel on overlay click when persistent', async () => {
    el.persistent = true;
    el.open = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('cancel', handler);
    el.shadowRoot!.querySelector<HTMLElement>('.overlay')!.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('still emits cancel on Escape when persistent', async () => {
    el.persistent = true;
    el.open = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('cancel', handler);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('shows reason textarea when showReason is true', async () => {
    el.showReason = true;
    el.open = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('textarea')).toBeTruthy();
  });

  it('includes reason in confirm detail', async () => {
    el.showReason = true;
    el.open = true;
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    textarea.value = 'Not ready yet';
    textarea.dispatchEvent(new Event('input'));
    const handler = vi.fn();
    el.addEventListener('confirm', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-confirm')!.click();
    expect(handler.mock.calls[0]![0].detail.reason).toBe('Not ready yet');
  });

  it('has aria-modal and aria-labelledby', async () => {
    el.open = true;
    await el.updateComplete;
    const dialog = el.shadowRoot!.querySelector('[role="alertdialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
  });
});
