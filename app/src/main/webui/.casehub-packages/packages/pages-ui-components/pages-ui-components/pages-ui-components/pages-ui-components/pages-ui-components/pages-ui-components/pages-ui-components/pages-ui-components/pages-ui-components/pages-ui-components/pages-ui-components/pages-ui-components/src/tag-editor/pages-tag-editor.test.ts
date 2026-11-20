import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesTagEditor', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-tag-editor');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-tag-editor')).toBeDefined();
  });

  it('renders existing tags as chips', async () => {
    (el as any).value = ['foo', 'bar'];
    await (el as any).updateComplete;
    const chips = el.shadowRoot!.querySelectorAll('[role="listitem"]');
    expect(chips.length).toBe(2);
    expect(chips[0]!.textContent).toContain('foo');
    expect(chips[1]!.textContent).toContain('bar');
  });

  it('renders a text input for adding tags', async () => {
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
  });

  it('each chip has a remove button with aria-label', async () => {
    (el as any).value = ['tag1'];
    await (el as any).updateComplete;
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('aria-label')).toBe("Remove 'tag1'");
  });

  it('hides input and remove buttons when readonly', async () => {
    (el as any).readonly = true;
    (el as any).value = ['a', 'b'];
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input');
    expect(input).toBeNull();
    const buttons = el.shadowRoot!.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Tags';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Tags');
  });

  it('shows error message', async () => {
    (el as any).error = 'At least one tag required';
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('At least one tag required');
  });

  it('uses role="list" on container', async () => {
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('[role="list"]')).not.toBeNull();
  });

  it('renders empty when no tags', async () => {
    await (el as any).updateComplete;
    const chips = el.shadowRoot!.querySelectorAll('[role="listitem"]');
    expect(chips.length).toBe(0);
  });

  it('disables input when disabled', async () => {
    (el as any).disabled = true;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('disables input when maxItems reached', async () => {
    (el as any).maxItems = 2;
    (el as any).value = ['a', 'b'];
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('defaults to empty array', () => {
    expect((el as any).value).toEqual([]);
  });
});
