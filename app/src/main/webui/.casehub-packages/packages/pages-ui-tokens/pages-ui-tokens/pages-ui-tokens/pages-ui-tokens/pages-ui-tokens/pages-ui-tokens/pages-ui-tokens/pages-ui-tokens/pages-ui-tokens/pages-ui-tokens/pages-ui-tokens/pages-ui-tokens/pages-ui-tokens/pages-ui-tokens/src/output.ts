import type { TokenMap } from './types.js';
import { isTokenLeaf } from './types.js';
import { DENSITY_COMPACT_OVERRIDES } from './tokens.js';

const CSS_PREFIX_MAP: Record<string, string> = {
  spacing: 'space',
  'font-size': 'font-size',
  'line-height': 'line-height',
  'font-weight': 'font-weight',
  duration: 'duration',
  ease: 'ease',
  radius: 'radius',
  shadow: 'shadow',
  surface: 'surface',
  role: '',
};

function tokensToCSSLines(tokens: TokenMap, parentPrefix: string): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) continue;

    if (isTokenLeaf(value)) {
      const cssName = parentPrefix ? `--pages-${parentPrefix}-${key}` : `--pages-${key}`;
      lines.push(`  ${cssName}: ${value.$value};`);
      continue;
    }

    const mapped = CSS_PREFIX_MAP[key];
    const childPrefix = mapped !== undefined
      ? (mapped === '' ? parentPrefix : (parentPrefix ? `${parentPrefix}-${mapped}` : mapped))
      : (parentPrefix ? `${parentPrefix}-${key}` : key);

    lines.push(...tokensToCSSLines(value, childPrefix));
  }
  return lines;
}

export function generateCSS(tokens: TokenMap, name: string): string {
  const lines = tokensToCSSLines(tokens, '');
  return `.pages-theme-${name} {\n${lines.join('\n')}\n}`;
}

export function generateDTCG(tokens: TokenMap, name: string): Record<string, unknown> {
  const result: Record<string, unknown> = { $name: name };
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) continue;
    if (isTokenLeaf(value)) {
      result[key] = { $value: value.$value, $type: value.$type };
    } else {
      result[key] = deepCopyTokens(value);
    }
  }
  return result;
}

function deepCopyTokens(tokens: TokenMap): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) continue;
    if (isTokenLeaf(value)) {
      result[key] = { $value: value.$value, $type: value.$type };
    } else {
      result[key] = deepCopyTokens(value);
    }
  }
  return result;
}

export function generateDensityCSS(): string {
  const lines = Object.entries(DENSITY_COMPACT_OVERRIDES)
    .map(([key, value]) => `  ${key}: ${value};`);
  return `.pages-density-compact {\n${lines.join('\n')}\n}`;
}
