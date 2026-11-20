export type TokenLeaf = { readonly $value: string; readonly $type: string };
export type TokenMap = { readonly [key: string]: TokenLeaf | TokenMap };

export type TransformFn = (tokens: TokenMap, params: Record<string, unknown>) => TokenMap;

export interface TransformDef {
  readonly transform: string;
  readonly params?: Record<string, unknown>;
}

export interface PresetConfig {
  readonly $name: string;
  readonly $description?: string;
  readonly $extends?: string;
  readonly pipeline: readonly TransformDef[];
}

export function isTokenLeaf(v: unknown): v is TokenLeaf {
  return v !== null && typeof v === 'object' && '$value' in v && '$type' in v;
}
