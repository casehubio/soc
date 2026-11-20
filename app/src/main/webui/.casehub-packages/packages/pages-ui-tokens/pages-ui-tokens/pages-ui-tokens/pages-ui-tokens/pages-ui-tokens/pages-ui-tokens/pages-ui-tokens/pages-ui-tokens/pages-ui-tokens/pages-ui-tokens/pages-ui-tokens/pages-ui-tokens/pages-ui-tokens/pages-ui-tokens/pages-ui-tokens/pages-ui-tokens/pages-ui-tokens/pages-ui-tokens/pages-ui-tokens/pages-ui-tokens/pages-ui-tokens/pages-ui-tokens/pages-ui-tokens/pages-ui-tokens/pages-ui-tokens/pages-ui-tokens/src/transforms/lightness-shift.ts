import type { TokenMap } from '../types.js';
import { isTokenLeaf } from '../types.js';

export function lightnessShift(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const offset = (params['offset'] as number) ?? 0;
  if (offset === 0) return tokens;
  return adjustColourTokens(tokens, (value) => {
    const match = value.match(/^oklch\((\d+\.?\d*)% (\d+\.?\d*) (\d+\.?\d*)\)$/);
    if (!match) return value;
    const l = Math.max(0, Math.min(100, parseFloat(match[1]!) + offset));
    return `oklch(${l.toFixed(1)}% ${match[2]} ${match[3]})`;
  });
}

function adjustColourTokens(tokens: TokenMap, adjust: (value: string) => string): TokenMap {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) { result[key] = value; continue; }
    if (isTokenLeaf(value)) {
      result[key] = value.$type === 'color'
        ? { $value: adjust(value.$value), $type: 'color' }
        : value;
    } else {
      result[key] = adjustColourTokens(value, adjust);
    }
  }
  return result as TokenMap;
}
