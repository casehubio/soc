import type { PresetConfig } from './types.js';
export interface ThemeStorage {
    save(name: string, config: PresetConfig): Promise<void>;
    load(name: string): Promise<PresetConfig | undefined>;
    list(): Promise<string[]>;
    remove(name: string): Promise<void>;
}
export declare class LocalStorageThemeStorage implements ThemeStorage {
    save(name: string, config: PresetConfig): Promise<void>;
    load(name: string): Promise<PresetConfig | undefined>;
    list(): Promise<string[]>;
    remove(name: string): Promise<void>;
}
export declare class ServerThemeStorage implements ThemeStorage {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    save(name: string, config: PresetConfig): Promise<void>;
    load(name: string): Promise<PresetConfig | undefined>;
    list(): Promise<string[]>;
    remove(name: string): Promise<void>;
}
export declare function detectStorage(baseUrl?: string): Promise<ThemeStorage>;
//# sourceMappingURL=theme-storage.d.ts.map