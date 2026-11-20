import { describe, it, expect, afterEach } from 'vitest';
import './pages-context-menu.js';
import type { PagesContextMenu, MenuItem } from './pages-context-menu.js';

function createMenu(items: MenuItem[]): PagesContextMenu {
  const el = document.createElement('pages-context-menu') as PagesContextMenu;
  el.items = items;
  return el;
}

const BASIC_ITEMS: MenuItem[] = [
  { label: 'Delete', action: 'delete', shortcut: '⌫' },
  { label: 'Duplicate', action: 'duplicate', shortcut: '⌃D' },
];

const SUBMENU_ITEMS: MenuItem[] = [
  { label: 'Wrap in…', children: [
    { label: 'Row', action: 'wrap-row' },
    { label: 'Tabs', action: 'wrap-tabs' },
  ]},
  { separator: true, label: '' },
  { label: 'Delete', action: 'delete' },
];

describe('PagesContextMenu', () => {
  let el: PagesContextMenu;

  afterEach(() => {
    el?.remove();
  });

  it('renders nothing when closed', async () => {
    el = createMenu(BASIC_ITEMS);
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.menu-container')).toBeNull();
  });

  it('renders menu items when open', async () => {
    el = createMenu(BASIC_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
    const items = el.shadowRoot!.querySelectorAll('[role="menuitem"]');
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain('Delete');
    expect(items[1]!.textContent).toContain('Duplicate');
  });

  it('renders shortcut text', async () => {
    el = createMenu(BASIC_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
    const shortcuts = el.shadowRoot!.querySelectorAll('.item-shortcut');
    expect(shortcuts).toHaveLength(2);
    expect(shortcuts[0]!.textContent).toBe('⌫');
  });

  it('fires menu-action on item click', async () => {
    el = createMenu(BASIC_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const actions: string[] = [];
    el.addEventListener('menu-action', (e: Event) => { actions.push((e as CustomEvent).detail.action); });

    const item = el.shadowRoot!.querySelector<HTMLElement>('[role="menuitem"]')!;
    item.click();
    expect(actions).toEqual(['delete']);
  });

  it('closes after action', async () => {
    el = createMenu(BASIC_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('[role="menuitem"]')!.click();
    expect(el.open).toBe(false);
  });

  it('supports submenus', async () => {
    el = createMenu(SUBMENU_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const parent = el.shadowRoot!.querySelector('[aria-haspopup="true"]');
    expect(parent).toBeTruthy();
    expect(parent!.textContent).toContain('Wrap in…');
  });

  it('renders separators', async () => {
    el = createMenu(SUBMENU_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const seps = el.shadowRoot!.querySelectorAll('[role="separator"]');
    expect(seps).toHaveLength(1);
  });

  it('closes on Escape', async () => {
    el = createMenu(BASIC_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const container = el.shadowRoot!.querySelector('.menu-container')!;
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el.open).toBe(false);
  });

  it('has correct ARIA roles', async () => {
    el = createMenu(BASIC_ITEMS);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('[role="menu"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelectorAll('[role="menuitem"]').length).toBe(2);
  });

  it('does not fire action for disabled items', async () => {
    el = createMenu([{ label: 'Disabled', action: 'nope', disabled: true }]);
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const actions: string[] = [];
    el.addEventListener('menu-action', (e: Event) => { actions.push((e as CustomEvent).detail.action); });

    el.shadowRoot!.querySelector<HTMLElement>('[role="menuitem"]')!.click();
    expect(actions).toHaveLength(0);
  });
});
