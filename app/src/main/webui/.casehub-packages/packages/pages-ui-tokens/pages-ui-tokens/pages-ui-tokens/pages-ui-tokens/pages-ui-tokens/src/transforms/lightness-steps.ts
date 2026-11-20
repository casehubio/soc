import type { TokenMap } from '../types.js';
import { isTokenLeaf } from '../types.js';

export function lightnessSteps(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const steps = params['steps'] as number[];
  if (!steps || steps.length !== 12) throw new Error('lightness-steps requires exactly 12 step values');

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) { result[key] = value; continue; }
    if (isTokenLeaf(value)) { result[key] = value; continue; }

    const group = value;
    const isColourScale = Object.keys(group).some(k => /^\d+$/.test(k) && isTokenLeaf(group[k]));
    if (!isColourScale) { result[key] = value; continue; }

    const newGroup: Record<string, unknown> = {};
    for (const [step, leaf] of Object.entries(group)) {
      if (!isTokenLeaf(leaf) || leaf.$type !== 'color') { newGroup[step] = leaf; continue; }
      const idx = parseInt(step, 10) - 1;
      if (idx < 0 || idx >= 12) { newGroup[step] = leaf; continue; }
      const match = leaf.$value.match(/^oklch\(\d+\.?\d*% (\d+\.?\d*) (\d+\.?\d*)\)$/);
      if (!match) { newGroup[step] = leaf; continue; }
      const l = Math.max(0, Math.min(100, steps[idx]!));
      newGroup[step] = { $value: `oklch(${l.toFixed(1)}% ${match[1]} ${match[2]})`, $type: 'color' };
    }
    result[key] = newGroup;
  }
  return result as TokenMap;
}
