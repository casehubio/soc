import type { TokenMap } from '../types.js';
import { isTokenLeaf } from '../types.js';

export function chromaCurve(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const curve = (params['curve'] as string) ?? 'flat';

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) { result[key] = value; continue; }
    if (isTokenLeaf(value)) { result[key] = value; continue; }

    const group = value;
    const isColourScale = Object.keys(group).some(k => /^\d+$/.test(k) && isTokenLeaf(group[k]));
    if (!isColourScale) { result[key] = value; continue; }

    const hueMultiplier = typeof params[key] === 'number' ? params[key] : 1;

    const newGroup: Record<string, unknown> = {};
    for (const [step, leaf] of Object.entries(group)) {
      if (!isTokenLeaf(leaf) || leaf.$type !== 'color') { newGroup[step] = leaf; continue; }
      const match = leaf.$value.match(/^oklch\((\d+\.?\d*)% (\d+\.?\d*) (\d+\.?\d*)\)$/);
      if (!match) { newGroup[step] = leaf; continue; }
      const idx = parseInt(step, 10) - 1;
      const weight = curveWeight(idx, curve);
      const newChroma = parseFloat(match[2]!) * hueMultiplier * weight;
      newGroup[step] = { $value: `oklch(${match[1]}% ${newChroma.toFixed(3)} ${match[3]})`, $type: 'color' };
    }
    result[key] = newGroup;
  }
  return result as TokenMap;
}

function curveWeight(stepIndex: number, curve: string): number {
  const t = stepIndex / 11;
  switch (curve) {
    case 'gaussian': {
      const center = 5.5;
      const sigma = 3;
      return Math.exp(-0.5 * Math.pow((stepIndex - center) / sigma, 2));
    }
    case 'bezier': {
      const p = 2 * t - 1;
      return 1 - p * p;
    }
    default: return 1;
  }
}
