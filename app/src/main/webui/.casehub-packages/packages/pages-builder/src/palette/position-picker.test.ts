import { describe, it, expect, afterEach } from 'vitest';
import './position-picker.js';
import type { PagesPositionPicker } from './position-picker.js';

describe('PagesPositionPicker', () => {
  let el: PagesPositionPicker;
  afterEach(() => { el?.remove(); });

  it('renders nothing when closed', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.position-popover')).toBeNull();
  });

  it('renders before and after buttons when open', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
    const btns = el.shadowRoot!.querySelectorAll('button');
    expect(btns.length).toBe(2);
    expect(btns[0]!.textContent?.trim()).toBe('Before');
    expect(btns[1]!.textContent?.trim()).toBe('After');
  });

  it('fires position-select with before', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('position-select', (e: Event) => { events.push(e as CustomEvent); });
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')[0]!.click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.position).toBe('before');
  });

  it('fires position-select with after', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('position-select', (e: Event) => { events.push(e as CustomEvent); });
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')[1]!.click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.position).toBe('after');
  });

  it('closes on Escape from within the popover', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('picker-close', (e) => events.push(e));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el.open).toBe(false);
    expect(events).toHaveLength(1);
  });

  it('closes on document Escape keydown', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('picker-close', (e) => events.push(e));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el.open).toBe(false);
    expect(events).toHaveLength(1);
  });

  it('closes after mouseleave with delay', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('picker-close', (e) => events.push(e));
    el.shadowRoot!.querySelector('.position-popover')!
      .dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    expect(el.open).toBe(true);
    await new Promise(r => setTimeout(r, 600));
    expect(el.open).toBe(false);
    expect(events).toHaveLength(1);
  });

  it('cancels mouseleave dismiss on mouseenter', async () => {
    el = document.createElement('pages-position-picker') as PagesPositionPicker;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const popover = el.shadowRoot!.querySelector('.position-popover')!;
    popover.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    popover.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));

    expect(el.open).toBe(true);
  });
});
