import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesStatusDot', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-status-dot');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-status-dot')).toBeDefined();
  });

  it('reflects variant attribute', async () => {
    (el as any).variant = 'success';
    await (el as any).updateComplete;
    expect(el.getAttribute('variant')).toBe('success');
  });

  it('reflects warning variant', async () => {
    (el as any).variant = 'warning';
    await (el as any).updateComplete;
    expect(el.getAttribute('variant')).toBe('warning');
  });

  it('reflects danger variant', async () => {
    (el as any).variant = 'danger';
    await (el as any).updateComplete;
    expect(el.getAttribute('variant')).toBe('danger');
  });

  it('reflects info variant', async () => {
    (el as any).variant = 'info';
    await (el as any).updateComplete;
    expect(el.getAttribute('variant')).toBe('info');
  });

  it('defaults to neutral variant', () => {
    expect((el as any).variant).toBe('neutral');
    expect(el.getAttribute('variant')).toBe('neutral');
  });

  it('reflects size attribute', async () => {
    (el as any).size = 'sm';
    await (el as any).updateComplete;
    expect(el.getAttribute('size')).toBe('sm');
  });

  it('defaults to md size', () => {
    expect((el as any).size).toBe('md');
  });

  it('has no rendered content beyond styles', async () => {
    await (el as any).updateComplete;
    const nonStyleChildren = Array.from(el.shadowRoot!.children).filter(c => c.tagName !== 'STYLE');
    expect(nonStyleChildren.length).toBe(0);
  });

  describe('ARIA', () => {
    it('has role="status"', async () => {
      await (el as any).updateComplete;
      expect(el.getAttribute('role')).toBe('status');
    });

    it('sets aria-label to variant by default', async () => {
      await (el as any).updateComplete;
      expect(el.getAttribute('aria-label')).toBe('neutral');
    });

    it('updates aria-label when variant changes', async () => {
      (el as any).variant = 'success';
      await (el as any).updateComplete;
      expect(el.getAttribute('aria-label')).toBe('success');
    });
  });
});
