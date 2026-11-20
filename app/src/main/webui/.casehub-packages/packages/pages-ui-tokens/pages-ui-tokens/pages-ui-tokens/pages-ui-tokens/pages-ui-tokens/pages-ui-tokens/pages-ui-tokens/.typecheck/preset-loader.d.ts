import type { PresetConfig, TransformDef } from './types.js';
export declare function registerBuiltinPreset(preset: PresetConfig): void;
export declare function getBuiltinPreset(name: string): PresetConfig | undefined;
export declare function listBuiltinPresets(): string[];
export declare function resolvePresetChain(preset: PresetConfig): TransformDef[];
//# sourceMappingURL=preset-loader.d.ts.map