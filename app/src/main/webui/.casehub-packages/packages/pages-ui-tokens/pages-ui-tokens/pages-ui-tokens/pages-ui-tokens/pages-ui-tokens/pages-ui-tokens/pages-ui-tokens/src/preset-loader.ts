import type { PresetConfig, TransformDef } from './types.js';

const builtinPresets = new Map<string, PresetConfig>();

export function registerBuiltinPreset(preset: PresetConfig): void {
  builtinPresets.set(preset.$name, preset);
}

export function getBuiltinPreset(name: string): PresetConfig | undefined {
  return builtinPresets.get(name);
}

export function listBuiltinPresets(): string[] {
  return [...builtinPresets.keys()];
}

export function resolvePresetChain(preset: PresetConfig): TransformDef[] {
  const visited = new Set<string>();
  return resolveChain(preset, visited);
}

function resolveChain(preset: PresetConfig, visited: Set<string>): TransformDef[] {
  if (preset.$name && visited.has(preset.$name)) {
    throw new Error(`Circular $extends: ${[...visited, preset.$name].join(' → ')}`);
  }
  if (preset.$name) visited.add(preset.$name);

  if (!preset.$extends) return [...preset.pipeline];

  const parent = builtinPresets.get(preset.$extends);
  if (!parent) {
    throw new Error(`Cannot resolve $extends: "${preset.$extends}". Available: ${[...builtinPresets.keys()].join(', ')}`);
  }

  return [...resolveChain(parent, visited), ...preset.pipeline];
}
