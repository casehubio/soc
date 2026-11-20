import { describe, it, expect, afterEach, vi } from 'vitest';
import './channel-nav.js';
import type { QhorusChannel } from './types.js';
import type { ChannelTree } from './channel-state-controller.js';
import { ChannelEventTopics } from './events.js';

describe('agency-channel-nav', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
  });

  it('renders list of channels with names', async () => {
    el = document.createElement('agency-channel-nav');
    const channels: QhorusChannel[] = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).channels = channels;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items.length).toBe(2);
    expect(items[0]!.textContent).toContain('General');
    expect(items[1]!.textContent).toContain('Urgent');
  });

  it('highlights selected channel', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).selectedChannelId = 'ch1';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items[0]!.classList.contains('selected')).toBe(true);
    expect(items[1]!.classList.contains('selected')).toBe(false);
    expect(items[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('emits channel:selected on channel click', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);
    (el.shadowRoot!.querySelector('.channel-item') as HTMLElement).click();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.SELECT_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch1' });
  });

  it('opens delete dialog on delete click', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.delete-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const dialog = el.shadowRoot!.querySelector('.delete-dialog') as any;
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBe(true);
    expect(dialog.heading).toBe('Delete Channel');
    expect(dialog.message).toContain('General');
  });

  it('emits channel:delete on dialog confirm', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.delete-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.delete-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.DELETE_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch1' });
  });

  it('closes delete dialog on cancel without emitting', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.delete-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.delete-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    await (el as any).updateComplete;

    expect(listener).not.toHaveBeenCalled();
    expect((el.shadowRoot!.querySelector('.delete-dialog') as any).open).toBe(false);
  });

  it('opens create dialog on create click', async () => {
    el = document.createElement('agency-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.create-channel-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const dialog = el.shadowRoot!.querySelector('.create-dialog') as any;
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBe(true);
    expect(dialog.heading).toBe('Create Channel');
    expect(dialog.showReason).toBe(true);
  });

  it('emits channel:create with name from dialog confirm', async () => {
    el = document.createElement('agency-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.create-channel-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.create-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true, detail: { reason: 'New Channel' } }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.CREATE_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ name: 'New Channel' });
  });

  it('does not emit create when dialog cancelled', async () => {
    el = document.createElement('agency-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.create-channel-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.create-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    await (el as any).updateComplete;

    expect(listener).not.toHaveBeenCalled();
    expect((el.shadowRoot!.querySelector('.create-dialog') as any).open).toBe(false);
  });

  it('navigates channels with arrow keys and Enter', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
      { id: 'ch3', name: 'Random', semantic: 'BARRIER', paused: false },
    ];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const list = el.shadowRoot!.querySelector('.channel-list') as HTMLElement;
    let items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items[0]!.classList.contains('focused')).toBe(true);

    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await (el as any).updateComplete;
    items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items[1]!.classList.contains('focused')).toBe(true);

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch2' });
  });

  it('handles empty channel list without crashing', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.channel-item').length).toBe(0);
    const list = el.shadowRoot!.querySelector('.channel-list') as HTMLElement;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await (el as any).updateComplete;
    expect((el as any)._focusedIndex).toBe(0);
  });

  // --- showCreate / showDelete toggles (#64) ---

  it('hides create button when showCreate=false', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).showCreate = false;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.create-channel-btn')).toBeNull();
  });

  it('shows create button by default', async () => {
    el = document.createElement('agency-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.create-channel-btn')).toBeTruthy();
  });

  it('hides delete buttons when showDelete=false', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    (el as any).showDelete = false;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.delete-btn')).toBeNull();
  });

  it('shows delete buttons by default', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.delete-btn')).toBeTruthy();
  });

  // --- unread count badges ---

  it('displays unread count badge from channel.unreadCount', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false, unreadCount: 42 },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false, unreadCount: 0 },
    ];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const badges = el.shadowRoot!.querySelectorAll('pages-badge');
    expect(badges.length).toBe(1);
    expect(badges[0]!.getAttribute('label')).toBe('42');
  });

  it('does not display count badge when unreadCount is zero or absent', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
    ];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('pages-badge')).toBeNull();
  });

  // --- layout: dropdown (#64) ---

  it('renders as custom dropdown in dropdown mode', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain('General');
    expect(el.shadowRoot!.querySelector('.channel-list')).toBeNull();

    trigger.click();
    await (el as any).updateComplete;

    const options = el.shadowRoot!.querySelectorAll('.dropdown-option');
    expect(options.length).toBe(2);
    expect(options[0]!.textContent).toContain('General');
    expect(options[1]!.textContent).toContain('Urgent');
  });

  it('emits channel:selected on dropdown option click', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const options = el.shadowRoot!.querySelectorAll('.dropdown-option');
    (options[1] as HTMLElement).click();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.SELECT_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch2' });
  });

  it('reflects selectedChannelId in dropdown trigger', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).layout = 'dropdown';
    (el as any).selectedChannelId = 'ch2';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    expect(trigger.textContent).toContain('Urgent');
  });

  it('shows unread counts in dropdown options', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false, unreadCount: 7 },
    ];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    expect(trigger.textContent).toContain('(7)');

    trigger.click();
    await (el as any).updateComplete;
    const option = el.shadowRoot!.querySelector('.dropdown-option .dropdown-count');
    expect(option).toBeTruthy();
    expect(option!.textContent!.trim()).toBe('7');
  });

  it('closes dropdown on Escape', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    trigger.click();
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.dropdown-panel')).toBeTruthy();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.dropdown-panel')).toBeNull();
  });

  it('hides create and delete in dropdown mode regardless of toggle values', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    (el as any).layout = 'dropdown';
    (el as any).showCreate = true;
    (el as any).showDelete = true;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.create-channel-btn')).toBeNull();
    expect(el.shadowRoot!.querySelector('.delete-btn')).toBeNull();
  });

  it('renders sidebar by default', async () => {
    el = document.createElement('agency-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.channel-list')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.dropdown-trigger')).toBeNull();
  });

  // --- tree rendering ---

  describe('tree mode', () => {
    function makeTree(): ChannelTree {
      return {
        ungrouped: [
          { id: 'ch-g', name: 'general', semantic: 'APPEND', paused: false, unreadCount: 3 },
        ],
        spaces: [
          {
            space: { id: 'sp-1', name: 'Case Alpha' },
            channels: [
              { id: 'ch-w', name: 'work', semantic: 'APPEND', paused: false, unreadCount: 0 },
              { id: 'ch-o', name: 'observe', semantic: 'APPEND', paused: false, unreadCount: 5 },
            ],
            unreadCount: 5,
            children: [],
          },
          {
            space: { id: 'sp-2', name: 'Case Beta' },
            channels: [
              { id: 'ch-b', name: 'beta-work', semantic: 'APPEND', paused: false, unreadCount: 2 },
            ],
            unreadCount: 2,
            children: [],
          },
        ],
      };
    }

    it('renders ungrouped channels and space groups', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const headers = el.shadowRoot!.querySelectorAll('.space-header');
      expect(headers.length).toBe(2);
      expect(headers[0]!.textContent).toContain('Case Alpha');
      expect(headers[1]!.textContent).toContain('Case Beta');

      const ungroupedItems = el.shadowRoot!.querySelectorAll('.ungrouped .channel-item');
      expect(ungroupedItems.length).toBe(1);
      expect(ungroupedItems[0]!.textContent).toContain('general');
    });

    it('shows unread badge on space header', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const headers = el.shadowRoot!.querySelectorAll('.space-header');
      const alphaBadge = headers[0]!.querySelector('pages-badge');
      expect(alphaBadge).toBeTruthy();
      expect(alphaBadge!.getAttribute('label')).toBe('5');
    });

    it('hides unread badge when space unread is 0', async () => {
      el = document.createElement('agency-channel-nav');
      const tree = makeTree();
      tree.spaces[0]!.channels.forEach(ch => (ch as any).unreadCount = 0);
      (tree.spaces[0] as any).unreadCount = 0;
      (el as any).channelTree = tree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const headers = el.shadowRoot!.querySelectorAll('.space-header');
      expect(headers[0]!.querySelector('pages-badge')).toBeNull();
    });

    it('collapses space group on header click', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      let spaceChannels = el.shadowRoot!.querySelectorAll('.space-group:first-of-type .channel-item');
      expect(spaceChannels.length).toBe(2);

      const header = el.shadowRoot!.querySelector('.space-header') as HTMLElement;
      header.click();
      await (el as any).updateComplete;

      spaceChannels = el.shadowRoot!.querySelectorAll('.space-group:first-of-type .channel-item');
      expect(spaceChannels.length).toBe(0);
    });

    it('selects channel within space group', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const listener = vi.fn();
      el.addEventListener('pages-event', listener);

      const spaceChannels = el.shadowRoot!.querySelectorAll('.space-group .channel-item');
      (spaceChannels[0] as HTMLElement).click();

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.SELECT_CHANNEL);
      expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch-w' });
    });

    it('renders space filter dropdown with all spaces', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const select = el.shadowRoot!.querySelector('.space-filter') as HTMLSelectElement;
      expect(select).toBeTruthy();
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(3);
      expect(options[0]!.textContent).toBe('All Spaces');
      expect(options[1]!.textContent).toBe('Case Alpha');
      expect(options[2]!.textContent).toBe('Case Beta');
    });

    it('filters to selected space channels plus ungrouped', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const select = el.shadowRoot!.querySelector('.space-filter') as HTMLSelectElement;
      select.value = 'sp-1';
      select.dispatchEvent(new Event('change'));
      await (el as any).updateComplete;

      const spaceGroups = el.shadowRoot!.querySelectorAll('.space-group');
      expect(spaceGroups.length).toBe(1);
      expect(el.shadowRoot!.querySelector('.space-header')!.textContent).toContain('Case Alpha');

      const ungrouped = el.shadowRoot!.querySelector('.ungrouped');
      expect(ungrouped).toBeNull();
    });

    it('resets to all spaces when All Spaces selected', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = makeTree();
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const select = el.shadowRoot!.querySelector('.space-filter') as HTMLSelectElement;
      select.value = 'sp-1';
      select.dispatchEvent(new Event('change'));
      await (el as any).updateComplete;

      select.value = '';
      select.dispatchEvent(new Event('change'));
      await (el as any).updateComplete;

      const spaceGroups = el.shadowRoot!.querySelectorAll('.space-group');
      expect(spaceGroups.length).toBe(2);
    });

    it('falls back to flat mode when channelTree absent', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
      document.body.appendChild(el);
      await (el as any).updateComplete;

      expect(el.shadowRoot!.querySelector('.channel-list')).toBeTruthy();
      expect(el.shadowRoot!.querySelector('.space-group')).toBeNull();
    });
  });

  describe('displayOrder sorting', () => {
    it('renders channels in displayOrder when tree is pre-sorted', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = {
        ungrouped: [],
        spaces: [{
          space: { id: 'sp1', name: 'Alpha' },
          channels: [
            { id: 'ch-a', name: 'alpha', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 0 },
            { id: 'ch-b', name: 'bravo', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 1 },
            { id: 'ch-c', name: 'charlie', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 2 },
          ],
          unreadCount: 0,
          children: [],
        }],
      };
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const items = el.shadowRoot!.querySelectorAll('.space-channels .channel-item');
      expect(items[0]!.textContent).toContain('alpha');
      expect(items[1]!.textContent).toContain('bravo');
      expect(items[2]!.textContent).toContain('charlie');
    });

    it('channelTree getter sorts by displayOrder (nulls last, then name)', async () => {
      const { ChannelStateController } = await import('./channel-state-controller.js');
      const host = { addController: vi.fn(), requestUpdate: vi.fn() };
      const push = { registerDatasetHandler: vi.fn() };
      const ctrl = new ChannelStateController(host, push);
      ctrl.channels = [
        { id: 'ch-c', name: 'charlie', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 2 },
        { id: 'ch-a', name: 'alpha', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 0 },
        { id: 'ch-z', name: 'zulu', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0 },
        { id: 'ch-b', name: 'bravo', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 1 },
      ];
      const tree = ctrl.channelTree;
      const names = tree.spaces[0]!.channels.map((ch: any) => ch.name);
      expect(names).toEqual(['alpha', 'bravo', 'charlie', 'zulu']);
    });
  });

  describe('context menu', () => {
    const mockTree: ChannelTree = {
      ungrouped: [
        { id: 'ch-ug', name: 'general', semantic: 'APPEND', paused: false, unreadCount: 0 },
      ],
      spaces: [{
        space: { id: 'sp1', name: 'Case Alpha' },
        channels: [
          { id: 'ch1', name: 'work', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Case Alpha', unreadCount: 0 },
        ],
        unreadCount: 0,
        children: [],
      }, {
        space: { id: 'sp2', name: 'Case Beta' },
        channels: [
          { id: 'ch2', name: 'observe', semantic: 'APPEND', paused: false, spaceId: 'sp2', spaceName: 'Case Beta', unreadCount: 0 },
        ],
        unreadCount: 0,
        children: [],
      }],
    };

    it('shows space context menu on right-click of space header', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const header = el.shadowRoot!.querySelector('.space-header')!;
      header.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;

      const menu = el.shadowRoot!.querySelector('.context-menu');
      expect(menu).toBeTruthy();
      const items = menu!.querySelectorAll('.context-menu-item');
      expect(items[0]!.textContent!.trim()).toBe('Rename');
      expect(items[1]!.textContent!.trim()).toBe('Delete');
      expect(items[2]!.textContent!.trim()).toBe('Create Channel Here');
    });

    it('shows channel context menu with Move to Space submenu', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const items = el.shadowRoot!.querySelectorAll('.channel-item');
      const spacedChannel = Array.from(items).find(i => i.textContent!.includes('work'))!;
      spacedChannel.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;

      const menu = el.shadowRoot!.querySelector('.context-menu');
      expect(menu).toBeTruthy();
      const trigger = menu!.querySelector('.submenu-trigger');
      expect(trigger).toBeTruthy();
      expect(trigger!.textContent).toContain('Move to Space');
      const submenuItems = menu!.querySelectorAll('.submenu .context-menu-item');
      expect(submenuItems.length).toBeGreaterThan(0);
    });

    it('dismisses context menu on outside click', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const header = el.shadowRoot!.querySelector('.space-header')!;
      header.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;
      expect(el.shadowRoot!.querySelector('.context-menu')).toBeTruthy();

      // requestAnimationFrame callback needs to fire before the click listener is registered
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 0));
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await (el as any).updateComplete;
      expect(el.shadowRoot!.querySelector('.context-menu')).toBeFalsy();
    });

    it('emits space:rename on inline rename Enter', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('pages-event', (e: Event) => events.push(e as CustomEvent));

      const header = el.shadowRoot!.querySelector('.space-header')!;
      header.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;

      const renameItem = el.shadowRoot!.querySelectorAll('.context-menu .context-menu-item')[0]!;
      (renameItem as HTMLElement).click();
      await (el as any).updateComplete;

      const input = el.shadowRoot!.querySelector('.space-rename-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      input.value = 'Renamed Space';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await (el as any).updateComplete;

      const renameEvent = events.find(e => e.detail.topic === ChannelEventTopics.RENAME_SPACE);
      expect(renameEvent).toBeTruthy();
      expect(renameEvent!.detail.payload.newName).toBe('Renamed Space');
    });

    it('emits space:create on create space dialog confirm', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('pages-event', (e: Event) => events.push(e as CustomEvent));

      const createBtn = el.shadowRoot!.querySelector('.create-space-btn') as HTMLElement;
      createBtn.click();
      await (el as any).updateComplete;

      const dialog = el.shadowRoot!.querySelector('.create-space-dialog') as any;
      dialog.dispatchEvent(new CustomEvent('confirm', { detail: { reason: 'New Space' }, bubbles: true }));
      await (el as any).updateComplete;

      const createEvent = events.find(e => e.detail.topic === ChannelEventTopics.CREATE_SPACE);
      expect(createEvent).toBeTruthy();
      expect(createEvent!.detail.payload.name).toBe('New Space');
    });

    it('emits space:delete after delete confirmation', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('pages-event', (e: Event) => events.push(e as CustomEvent));

      const header = el.shadowRoot!.querySelector('.space-header')!;
      header.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;

      const deleteItem = el.shadowRoot!.querySelectorAll('.context-menu .context-menu-item')[1]!;
      (deleteItem as HTMLElement).click();
      await (el as any).updateComplete;

      const dialog = el.shadowRoot!.querySelector('.delete-space-dialog') as any;
      dialog.dispatchEvent(new CustomEvent('confirm', { bubbles: true }));
      await (el as any).updateComplete;

      const deleteEvent = events.find(e => e.detail.topic === ChannelEventTopics.DELETE_SPACE);
      expect(deleteEvent).toBeTruthy();
    });

    it('emits channel:create with spaceId for Create Channel Here', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('pages-event', (e: Event) => events.push(e as CustomEvent));

      const header = el.shadowRoot!.querySelector('.space-header')!;
      header.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;

      const items = el.shadowRoot!.querySelectorAll('.context-menu .context-menu-item');
      const createItem = items[items.length - 1]!;
      (createItem as HTMLElement).click();
      await (el as any).updateComplete;

      const dialog = el.shadowRoot!.querySelector('.create-dialog') as any;
      dialog.dispatchEvent(new CustomEvent('confirm', { detail: { reason: 'new-channel' }, bubbles: true }));
      await (el as any).updateComplete;

      const createEvent = events.find(e => e.detail.topic === ChannelEventTopics.CREATE_CHANNEL);
      expect(createEvent).toBeTruthy();
      expect(createEvent!.detail.payload.spaceId).toBe('sp1');
    });

    it('emits channel:move-to-space on submenu click', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('pages-event', (e: Event) => events.push(e as CustomEvent));

      const channelItems = el.shadowRoot!.querySelectorAll('.channel-item');
      const spacedChannel = Array.from(channelItems).find(i => i.textContent!.includes('work'))!;
      spacedChannel.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }));
      await (el as any).updateComplete;

      const submenuItems = el.shadowRoot!.querySelectorAll('.submenu .context-menu-item');
      expect(submenuItems.length).toBeGreaterThan(0);
      (submenuItems[0] as HTMLElement).click();
      await (el as any).updateComplete;

      const moveEvent = events.find(e => e.detail.topic === ChannelEventTopics.MOVE_CHANNEL_TO_SPACE);
      expect(moveEvent).toBeTruthy();
    });

    it('renders + Create Space button in tree mode', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = mockTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const btn = el.shadowRoot!.querySelector('.create-space-btn');
      expect(btn).toBeTruthy();
    });
  });

  describe('drag and drop', () => {
    const dndTree: ChannelTree = {
      ungrouped: [
        { id: 'ch-ug', name: 'general', semantic: 'APPEND', paused: false, unreadCount: 0, displayOrder: 0 },
      ],
      spaces: [{
        space: { id: 'sp1', name: 'Alpha' },
        channels: [
          { id: 'ch-a', name: 'alpha', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 0 },
          { id: 'ch-b', name: 'bravo', semantic: 'APPEND', paused: false, spaceId: 'sp1', spaceName: 'Alpha', unreadCount: 0, displayOrder: 1 },
        ],
        unreadCount: 0,
        children: [],
      }, {
        space: { id: 'sp2', name: 'Beta' },
        channels: [
          { id: 'ch-c', name: 'charlie', semantic: 'APPEND', paused: false, spaceId: 'sp2', spaceName: 'Beta', unreadCount: 0, displayOrder: 0 },
        ],
        unreadCount: 0,
        children: [],
      }],
    };

    it('sets draggable on channel items in tree mode', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = dndTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const items = el.shadowRoot!.querySelectorAll('.channel-item');
      for (const item of items) {
        expect(item.getAttribute('draggable')).toBe('true');
      }
    });

    it('adds dragging class on dragstart', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = dndTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const items = el.shadowRoot!.querySelectorAll('.channel-item');
      const item = items[1] as HTMLElement; // first space channel
      const startEvt = new Event('dragstart', { bubbles: true }) as any;
      startEvt.dataTransfer = { effectAllowed: '', setData: vi.fn() };
      item.dispatchEvent(startEvt);
      await (el as any).updateComplete;

      expect(item.classList.contains('dragging')).toBe(true);
    });

    it('clears dragging state on dragend', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = dndTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      const items = el.shadowRoot!.querySelectorAll('.channel-item');
      const item = items[1] as HTMLElement;
      const startEvt = new Event('dragstart', { bubbles: true }) as any;
      startEvt.dataTransfer = { effectAllowed: '', setData: vi.fn() };
      item.dispatchEvent(startEvt);
      await (el as any).updateComplete;
      expect(item.classList.contains('dragging')).toBe(true);

      item.dispatchEvent(new Event('dragend', { bubbles: true }));
      await (el as any).updateComplete;
      expect(item.classList.contains('dragging')).toBe(false);
    });

    it('highlights space header as drop target', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = dndTree;
      document.body.appendChild(el);
      await (el as any).updateComplete;

      (el as any)._dragChannelId = 'ch-a';
      (el as any)._dropTarget = { spaceId: 'sp2', position: -1 };
      await (el as any).updateComplete;

      const headers = el.shadowRoot!.querySelectorAll('.space-header');
      expect(headers[1]!.classList.contains('drop-target')).toBe(true);
      expect(headers[0]!.classList.contains('drop-target')).toBe(false);
    });

    it('shows empty ungrouped drop zone during drag when all channels are in spaces', async () => {
      el = document.createElement('agency-channel-nav');
      (el as any).channelTree = {
        ungrouped: [],
        spaces: dndTree.spaces,
      };
      document.body.appendChild(el);
      await (el as any).updateComplete;

      expect(el.shadowRoot!.querySelector('.drop-placeholder')).toBeNull();

      (el as any)._dragChannelId = 'ch-a';
      await (el as any).updateComplete;

      const placeholder = el.shadowRoot!.querySelector('.drop-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder!.textContent).toContain('Drop here');
    });
  });
});
