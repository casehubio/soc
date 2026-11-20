import type { TokenMap, TokenLeaf } from '../types.js';
import { ELEVATION_LIGHT } from '../tokens.js';

export function lightMode(tokens: TokenMap, _params: Record<string, unknown>): TokenMap {
  const result: Record<string, unknown> = { ...tokens };

  result['$mode'] = { $value: 'light', $type: 'meta' };

  const shadow: Record<string, TokenLeaf> = {};
  for (const [key, value] of Object.entries(ELEVATION_LIGHT.shadow)) {
    shadow[key] = { $value: value, $type: 'shadow' };
  }
  result['shadow'] = shadow;

  const surface: Record<string, TokenLeaf> = {};
  for (let i = 1; i <= 4; i++) {
    const opacity = 0.02 + (i * 0.02);
    surface[String(i)] = { $value: `oklch(0% 0 0 / ${opacity.toFixed(2)})`, $type: 'color' };
  }
  result['surface'] = surface;

  return result as TokenMap;
}
