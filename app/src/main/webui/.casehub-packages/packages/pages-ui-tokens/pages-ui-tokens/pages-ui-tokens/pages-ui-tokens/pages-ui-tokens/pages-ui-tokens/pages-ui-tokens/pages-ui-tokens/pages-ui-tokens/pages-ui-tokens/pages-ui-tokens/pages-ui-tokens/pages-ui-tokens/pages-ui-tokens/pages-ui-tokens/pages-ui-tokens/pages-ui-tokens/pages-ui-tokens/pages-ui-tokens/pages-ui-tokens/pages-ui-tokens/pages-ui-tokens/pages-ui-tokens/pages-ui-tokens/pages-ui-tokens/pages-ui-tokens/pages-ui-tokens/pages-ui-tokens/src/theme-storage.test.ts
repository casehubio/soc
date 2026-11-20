import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PresetConfig } from './types.js';

const TEST_PRESET: PresetConfig = {
  $name: 'test-dark',
  $description: 'Test theme',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: { hues: { accent: 200, neutral: 220 }, chroma: 0.15, contrast: 0.5 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}

beforeEach(() => {
  const mockStorage = createMockLocalStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
});

describe('LocalStorageThemeStorage', () => {
  let storage: import('./theme-storage.js').LocalStorageThemeStorage;

  beforeEach(async () => {
    const mod = await import('./theme-storage.js');
    storage = new mod.LocalStorageThemeStorage();
  });

  it('save and load round-trips a PresetConfig', async () => {
    await storage.save('test-dark', TEST_PRESET);
    const loaded = await storage.load('test-dark');
    expect(loaded).toEqual(TEST_PRESET);
  });

  it('load returns undefined for unknown name', async () => {
    const result = await storage.load('nonexistent');
    expect(result).toBeUndefined();
  });

  it('list returns saved theme names', async () => {
    await storage.save('alpha', TEST_PRESET);
    await storage.save('beta', { ...TEST_PRESET, $name: 'beta' });
    const names = await storage.list();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    expect(names).toHaveLength(2);
  });

  it('list returns empty array when nothing saved', async () => {
    const names = await storage.list();
    expect(names).toEqual([]);
  });

  it('remove deletes a saved theme', async () => {
    await storage.save('to-remove', TEST_PRESET);
    await storage.remove('to-remove');
    const loaded = await storage.load('to-remove');
    expect(loaded).toBeUndefined();
    const names = await storage.list();
    expect(names).not.toContain('to-remove');
  });

  it('remove is a no-op for unknown name', async () => {
    await expect(storage.remove('nonexistent')).resolves.toBeUndefined();
  });

  it('does not collide with non-theme localStorage keys', async () => {
    globalThis.localStorage.setItem('unrelated-key', 'value');
    await storage.save('my-theme', TEST_PRESET);
    const names = await storage.list();
    expect(names).toEqual(['my-theme']);
    expect(globalThis.localStorage.getItem('unrelated-key')).toBe('value');
  });
});

describe('ServerThemeStorage', () => {
  let storage: import('./theme-storage.js').ServerThemeStorage;

  beforeEach(async () => {
    const mod = await import('./theme-storage.js');
    storage = new mod.ServerThemeStorage('/api/themes');
    vi.restoreAllMocks();
  });

  it('list calls GET and returns names', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(['alpha', 'beta']), { status: 200 }),
    );
    const names = await storage.list();
    expect(names).toEqual(['alpha', 'beta']);
  });

  it('load calls GET with name and returns config', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(TEST_PRESET), { status: 200 }),
    );
    const config = await storage.load('test-dark');
    expect(config).toEqual(TEST_PRESET);
  });

  it('load returns undefined on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 404 }),
    );
    const config = await storage.load('missing');
    expect(config).toBeUndefined();
  });

  it('save calls PUT with config body', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 200 }),
    );
    await storage.save('test-dark', TEST_PRESET);
    expect(spy).toHaveBeenCalledWith('/api/themes/test-dark', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify(TEST_PRESET),
    }));
  });

  it('remove calls DELETE', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 200 }),
    );
    await storage.remove('test-dark');
    expect(spy).toHaveBeenCalledWith('/api/themes/test-dark', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});

describe('detectStorage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ServerThemeStorage when server responds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    const mod = await import('./theme-storage.js');
    const storage = await mod.detectStorage();
    expect(storage).toBeInstanceOf(mod.ServerThemeStorage);
  });

  it('returns LocalStorageThemeStorage when server unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));
    const mod = await import('./theme-storage.js');
    const storage = await mod.detectStorage();
    expect(storage).toBeInstanceOf(mod.LocalStorageThemeStorage);
  });
});
