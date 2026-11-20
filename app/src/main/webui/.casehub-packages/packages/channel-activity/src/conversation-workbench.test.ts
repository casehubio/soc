import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConversationWorkbenchElement } from './conversation-workbench.js';
import type { ConversationWorkbenchConfig, ConnectPushOptions } from './conversation-workbench.js';

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(),
    onchange: null, dispatchEvent: vi.fn(),
  }));
}

function minimalConfig(overrides: Partial<ConversationWorkbenchConfig> = {}): ConversationWorkbenchConfig {
  return {
    fetch: vi.fn().mockResolvedValue(new Response('[]')),
    connectPush: vi.fn().mockReturnValue({ close: vi.fn() }),
    currentActorId: 'test-user',
    restBase: '/api',
    sendMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ConversationWorkbenchElement', () => {
  it('registers as agency-conversation-workbench', () => {
    expect(customElements.get('agency-conversation-workbench')).toBe(ConversationWorkbenchElement);
  });

  it('exports config types', () => {
    const config: ConversationWorkbenchConfig = minimalConfig();
    expect(config.currentActorId).toBe('test-user');
    expect(config.restBase).toBe('/api');
  });

  it('constructs with default layout state', () => {
    const el = new ConversationWorkbenchElement();
    expect(el).toBeInstanceOf(HTMLElement);
  });

  describe('config callbacks', () => {
    it('sendMessage is required in config', () => {
      const config = minimalConfig();
      expect(typeof config.sendMessage).toBe('function');
    });

    it('space callbacks are optional', () => {
      const config = minimalConfig();
      expect(config.createSpace).toBeUndefined();
      expect(config.renameSpace).toBeUndefined();
      expect(config.deleteSpace).toBeUndefined();
      expect(config.moveChannelToSpace).toBeUndefined();
    });

    it('correction callbacks are optional', () => {
      const config = minimalConfig();
      expect(config.correctMessage).toBeUndefined();
      expect(config.retractMessage).toBeUndefined();
    });

    it('channelFilter is optional', () => {
      const config = minimalConfig();
      expect(config.channelFilter).toBeUndefined();
    });

    it('layoutStore is optional', () => {
      const config = minimalConfig();
      expect(config.layoutStore).toBeUndefined();
    });

    it('connectPush receives topics and callbacks', async () => {
      const connectPush = vi.fn().mockReturnValue({ close: vi.fn() });
      const config = minimalConfig({ connectPush });
      const el = new ConversationWorkbenchElement();
      el.config = config;
      document.body.appendChild(el);
      await el.updateComplete;

      expect(connectPush).toHaveBeenCalledWith(
        expect.objectContaining({
          onOp: expect.any(Function),
          onStatusChange: expect.any(Function),
          topics: expect.any(Array),
        })
      );

      el.remove();
    });

    it('connectPush connection is closed on disconnect', async () => {
      const closeFn = vi.fn();
      const connectPush = vi.fn().mockReturnValue({ close: closeFn });
      const config = minimalConfig({ connectPush });
      const el = new ConversationWorkbenchElement();
      el.config = config;
      document.body.appendChild(el);
      await el.updateComplete;
      el.remove();

      expect(closeFn).toHaveBeenCalled();
    });
  });

  describe('channelFilter', () => {
    it('accepts a filter predicate', () => {
      const filter = (ch: any) => ch.name.startsWith('case-');
      const config = minimalConfig({ channelFilter: filter });
      expect(config.channelFilter).toBe(filter);
    });
  });

  describe('layout store', () => {
    it('accepts a layout store with load and save', () => {
      const store = {
        load: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
      };
      const config = minimalConfig({ layoutStore: store });
      expect(config.layoutStore).toBe(store);
    });
  });
});

