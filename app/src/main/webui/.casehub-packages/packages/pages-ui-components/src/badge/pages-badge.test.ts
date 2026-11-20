import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesBadge', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-badge');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-badge')).toBeDefined();
  });

  it('renders label text', async () => {
    (el as any).label = 'ACTIVE';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('[role="status"]');
    expect(span?.textContent?.trim()).toBe('ACTIVE');
  });

  it('applies success variant class', async () => {
    (el as any).variant = 'success';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('success')).toBe(true);
  });

  it('applies warning variant class', async () => {
    (el as any).variant = 'warning';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('warning')).toBe(true);
  });

  it('applies danger variant class', async () => {
    (el as any).variant = 'danger';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('danger')).toBe(true);
  });

  it('applies info variant class', async () => {
    (el as any).variant = 'info';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('info')).toBe(true);
  });

  it('applies accent variant class', async () => {
    (el as any).variant = 'accent';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('accent')).toBe(true);
  });

  it('defaults to neutral variant', async () => {
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('neutral')).toBe(true);
  });

  it('applies sm size class', async () => {
    (el as any).size = 'sm';
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('sm')).toBe(true);
  });

  it('does not apply sm class for default md size', async () => {
    await (el as any).updateComplete;
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span?.classList.contains('sm')).toBe(false);
  });

  it('defaults to empty label', () => {
    expect((el as any).label).toBe('');
  });

  it('defaults to md size', () => {
    expect((el as any).size).toBe('md');
  });

  describe('ARIA', () => {
    it('has role="status" on inner span', async () => {
      await (el as any).updateComplete;
      const span = el.shadowRoot!.querySelector('[role="status"]');
      expect(span).not.toBeNull();
    });

    it('sets aria-label matching label text', async () => {
      (el as any).label = 'ACTIVE';
      await (el as any).updateComplete;
      const span = el.shadowRoot!.querySelector('[role="status"]')!;
      expect(span.getAttribute('aria-label')).toBe('ACTIVE');
    });
  });
});
