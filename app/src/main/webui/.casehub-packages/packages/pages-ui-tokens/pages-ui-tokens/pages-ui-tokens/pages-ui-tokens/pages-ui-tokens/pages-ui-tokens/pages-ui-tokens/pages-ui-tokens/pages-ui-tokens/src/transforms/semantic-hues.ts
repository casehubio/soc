import type { TokenMap, TokenLeaf } from '../types.js';
import { isTokenLeaf } from '../types.js';
import { generateScale } from '../colours.js';

export function semanticHues(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const mode = (tokens['$mode'] as TokenLeaf | undefined)?.$value ?? 'light';
  const isDark = mode === 'dark';
  const result: Record<string, unknown> = { ...tokens };

  for (const [name, hue] of Object.entries(params)) {
    if (typeof hue !== 'number') continue;
    if (!['success', 'warning', 'danger', 'info'].includes(name)) continue;

    const existingGroup = tokens[name] as TokenMap | undefined;
    if (!existingGroup) continue;

    const firstLeaf = Object.values(existingGroup).find(v => isTokenLeaf(v));
    if (!firstLeaf) continue;
    const chromaMatch = firstLeaf.$value.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/);
    if (!chromaMatch) continue;
    const oldChroma = parseFloat(chromaMatch[1]!);

    const scale = generateScale(hue, oldChroma, 0.5, isDark);
    const group: Record<string, { $value: string; $type: string }> = {};
    for (const [step, value] of Object.entries(scale)) {
      group[step] = { $value: value, $type: 'color' };
    }
    result[name] = group;
  }

  return result as TokenMap;
}
