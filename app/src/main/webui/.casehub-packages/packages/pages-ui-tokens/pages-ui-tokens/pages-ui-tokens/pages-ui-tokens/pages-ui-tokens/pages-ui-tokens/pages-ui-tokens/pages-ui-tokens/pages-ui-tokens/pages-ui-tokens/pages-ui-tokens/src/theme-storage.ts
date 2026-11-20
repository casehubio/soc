import type { PresetConfig } from './types.js';

export interface ThemeStorage {
  save(name: string, config: PresetConfig): Promise<void>;
  load(name: string): Promise<PresetConfig | undefined>;
  list(): Promise<string[]>;
  remove(name: string): Promise<void>;
}

const KEY_PREFIX = 'pages-theme:';

export class LocalStorageThemeStorage implements ThemeStorage {
  async save(name: string, config: PresetConfig): Promise<void> {
    globalThis.localStorage.setItem(KEY_PREFIX + name, JSON.stringify(config));
  }

  async load(name: string): Promise<PresetConfig | undefined> {
    const raw = globalThis.localStorage.getItem(KEY_PREFIX + name);
    if (!raw) return undefined;
    return JSON.parse(raw) as PresetConfig;
  }

  async list(): Promise<string[]> {
    const names: string[] = [];
    for (let i = 0; i < globalThis.localStorage.length; i++) {
      const key = globalThis.localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) {
        names.push(key.slice(KEY_PREFIX.length));
      }
    }
    return names;
  }

  async remove(name: string): Promise<void> {
    globalThis.localStorage.removeItem(KEY_PREFIX + name);
  }
}

export class ServerThemeStorage implements ThemeStorage {
  constructor(private readonly baseUrl: string = '/api/themes') {}

  async save(name: string, config: PresetConfig): Promise<void> {
    await fetch(`${this.baseUrl}/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  async load(name: string): Promise<PresetConfig | undefined> {
    const res = await fetch(`${this.baseUrl}/${name}`);
    if (!res.ok) return undefined;
    return (await res.json()) as PresetConfig;
  }

  async list(): Promise<string[]> {
    const res = await fetch(this.baseUrl);
    return (await res.json()) as string[];
  }

  async remove(name: string): Promise<void> {
    await fetch(`${this.baseUrl}/${name}`, { method: 'DELETE' });
  }
}

export async function detectStorage(baseUrl = '/api/themes'): Promise<ThemeStorage> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return new ServerThemeStorage(baseUrl);
  } catch { /* server unavailable */ }
  return new LocalStorageThemeStorage();
}
