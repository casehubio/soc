import type { TokenMap } from '../types.js';

export function override(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const result: Record<string, unknown> = { ...tokens };
  for (const [path, value] of Object.entries(params)) {
    if (typeof value !== 'string') continue;
    const parts = path.split('.');
    if (parts.length === 1) {
      result[parts[0]!] = { $value: value, $type: 'color' };
    } else if (parts.length === 2) {
      const [group, key] = parts;
      const existing = result[group!];
      const groupObj = (existing && typeof existing === 'object') ? { ...existing as Record<string, unknown> } : {};
      groupObj[key!] = { $value: value, $type: 'color' };
      result[group!] = groupObj;
    }
  }
  return result as TokenMap;
}
