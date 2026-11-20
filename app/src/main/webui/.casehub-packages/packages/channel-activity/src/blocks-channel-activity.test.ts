import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './blocks-channel-activity.js';

describe('blocks-channel-activity', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    el = document.createElement('blocks-channel-activity');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders split-workbench with nav and feed', async () => {
    await (el as any).updateComplete;
    const sr = el.shadowRoot!;
    const workbench = sr.querySelector('pages-split-workbench');
    expect(workbench).toBeTruthy();
    expect(workbench!.getAttribute('selection-topic')).toBe('channel');
    const nav = sr.querySelector('blocks-channel-nav');
    expect(nav).toBeTruthy();
    const feed = sr.querySelector('blocks-channel-feed');
    expect(feed).toBeTruthy();
    const input = sr.querySelector('blocks-channel-input');
    expect(input).toBeTruthy();
    const topicBar = sr.querySelector('blocks-channel-topic-bar');
    expect(topicBar).toBeTruthy();
  });

  it('has role region and aria-label', async () => {
    await (el as any).updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Channel activity');
  });

  it('passes selectionTopic to split-workbench', async () => {
    (el as any).selectionTopic = 'my-channel';
    await (el as any).updateComplete;
    const wb = el.shadowRoot!.querySelector('pages-split-workbench');
    expect(wb!.getAttribute('selection-topic')).toBe('my-channel');
  });

  it('passes channelNavLayout to channel-nav', async () => {
    (el as any).channelNavLayout = 'dropdown';
    await (el as any).updateComplete;
    const nav = el.shadowRoot!.querySelector('blocks-channel-nav') as any;
    expect(nav.layout).toBe('dropdown');
  });

  it('m key toggles sidebar', async () => {
    await (el as any).updateComplete;
    expect((el as any).sidebarOpen).toBe(false);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect((el as any).sidebarOpen).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect((el as any).sidebarOpen).toBe(false);
  });

  it('Escape closes sidebar when open', async () => {
    (el as any).sidebarOpen = true;
    await (el as any).updateComplete;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect((el as any).sidebarOpen).toBe(false);
  });

  it('configure() sets properties', async () => {
    (el as any).configure({ selectionTopic: 'custom', channelNavLayout: 'dropdown' });
    await (el as any).updateComplete;
    expect((el as any).selectionTopic).toBe('custom');
    expect((el as any).channelNavLayout).toBe('dropdown');
  });

  it('passes inline data to sub-components', async () => {
    (el as any).channels = [{ id: 'ch1', name: 'General' }];
    (el as any).messages = [{ id: 'm1', channelId: 'ch1', content: 'hello', sender: 'alice' }];
    await (el as any).updateComplete;
    const nav = el.shadowRoot!.querySelector('blocks-channel-nav') as any;
    expect(nav.channels.length).toBe(1);
    const feed = el.shadowRoot!.querySelector('blocks-channel-feed') as any;
    expect(feed.messages.length).toBe(1);
  });
});
