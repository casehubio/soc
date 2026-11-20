import type { TokenMap, TokenLeaf } from '../types.js';
import { ELEVATION_DARK } from '../tokens.js';

export function darkMode(tokens: TokenMap, _params: Record<string, unknown>): TokenMap {
  const result: Record<string, unknown> = { ...tokens };

  result['$mode'] = { $value: 'dark', $type: 'meta' };

  const shadow: Record<string, TokenLeaf> = {};
  for (const [key, value] of Object.entries(ELEVATION_DARK.shadow)) {
    shadow[key] = { $value: value, $type: 'shadow' };
  }
  result['shadow'] = shadow;

  const surface: Record<string, TokenLeaf> = {};
  for (let i = 1; i <= 4; i++) {
    const opacity = 0.05 + (i * 0.03);
    surface[String(i)] = { $value: `oklch(100% 0 0 / ${opacity.toFixed(2)})`, $type: 'color' };
  }
  result['surface'] = surface;

  return result as TokenMap;
}
