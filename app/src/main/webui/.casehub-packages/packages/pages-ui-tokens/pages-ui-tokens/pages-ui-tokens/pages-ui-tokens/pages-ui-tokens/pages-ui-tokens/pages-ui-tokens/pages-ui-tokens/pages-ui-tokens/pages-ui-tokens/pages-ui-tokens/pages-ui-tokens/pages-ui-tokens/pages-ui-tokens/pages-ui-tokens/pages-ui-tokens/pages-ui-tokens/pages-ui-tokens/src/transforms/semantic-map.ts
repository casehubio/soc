import type { TokenMap, TokenLeaf } from '../types.js';
import { isTokenLeaf } from '../types.js';

const DEFAULT_ROLE_MAPPINGS: Record<string, string> = {
  'surface-primary': 'neutral.1',
  'surface-secondary': 'neutral.2',
  'surface-tertiary': 'neutral.3',
  'surface-hover': 'neutral.4',
  'surface-selected': 'accent.2',

  'border-subtle': 'neutral.4',
  'border-default': 'neutral.6',
  'border-strong': 'neutral.8',

  'text-primary': 'neutral.12',
  'text-secondary': 'neutral.11',
  'text-muted': 'neutral.8',
  'text-disabled': 'neutral.6',

  'interactive': 'accent.9',
  'interactive-hover': 'accent.10',
  'interactive-active': 'accent.11',
  'focus-ring': 'accent.8',

  'status-success': 'success.9',
  'status-warning': 'warning.9',
  'status-danger': 'danger.9',
  'status-info': 'info.9',
};

function resolveRef(tokens: TokenMap, ref: string): TokenLeaf | undefined {
  const [group, key] = ref.split('.');
  if (!group || !key) return undefined;
  const g = tokens[group];
  if (!g || isTokenLeaf(g)) return undefined;
  const leaf = (g)[key];
  return isTokenLeaf(leaf) ? leaf : undefined;
}

export function semanticMap(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const mappings = { ...DEFAULT_ROLE_MAPPINGS };

  if (params['mappings'] && typeof params['mappings'] === 'object') {
    Object.assign(mappings, params['mappings']);
  }

  const result: Record<string, unknown> = { ...tokens };
  const roles: Record<string, TokenLeaf> = {};

  for (const [roleName, ref] of Object.entries(mappings)) {
    const resolved = resolveRef(tokens, ref);
    if (resolved) {
      roles[roleName] = { $value: `var(--pages-${ref.replace('.', '-')})`, $type: 'color' };
    }
  }

  result['role'] = roles;
  return result as TokenMap;
}
