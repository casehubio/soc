import type { TokenMap, TokenLeaf } from '../types.js';
import { isTokenLeaf } from '../types.js';

function oklchInGamut(L: number, C: number, H: number): boolean {
  const l = L / 100;
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const lr = l_ * l_ * l_;
  const mr = m_ * m_ * m_;
  const sr = s_ * s_ * s_;

  const r = 4.0767416621 * lr - 3.3077115913 * mr + 0.2309699292 * sr;
  const g = -1.2684380046 * lr + 2.6097574011 * mr - 0.3413193965 * sr;
  const bv = -0.0041960863 * lr - 0.7034186147 * mr + 1.7076147010 * sr;

  const eps = 0.001;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && bv >= -eps && bv <= 1 + eps;
}

function clampToGamut(L: number, C: number, H: number): [number, number, number] {
  if (oklchInGamut(L, C, H)) return [L, C, H];

  let lo = 0;
  let hi = C;
  while (hi - lo > 0.0001) {
    const mid = (lo + hi) / 2;
    if (oklchInGamut(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return [L, lo, H];
}

function clampLeaf(leaf: TokenLeaf): TokenLeaf {
  const match = leaf.$value.match(/^oklch\((\d+\.?\d*)% (\d+\.?\d*) (\d+\.?\d*)\)$/);
  if (!match) return leaf;
  const [L, C, H] = [parseFloat(match[1]!), parseFloat(match[2]!), parseFloat(match[3]!)];
  const [, cC] = clampToGamut(L, C, H);
  if (cC === C) return leaf;
  return { $value: `oklch(${L.toFixed(1)}% ${cC.toFixed(3)} ${H})`, $type: 'color' };
}

export function gamutClamp(tokens: TokenMap, _params: Record<string, unknown>): TokenMap {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) { result[key] = value; continue; }
    if (isTokenLeaf(value)) {
      result[key] = value.$type === 'color' ? clampLeaf(value) : value;
    } else {
      result[key] = gamutClamp(value, _params);
    }
  }
  return result as TokenMap;
}
